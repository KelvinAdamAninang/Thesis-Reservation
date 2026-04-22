from datetime import datetime
from models import Reservation, Room, db
from collections import Counter
from datetime import datetime, timedelta

from sqlalchemy.orm import joinedload

from models import Reservation, Room


def _build_monthly_report_payload(year, month):
    """Build monthly approved-reservations report payload for API and reporting use."""
    month = int(month)
    year = int(year)
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    reservations = Reservation.query.filter(
        Reservation.status == 'approved',
        Reservation.start_time.isnot(None),
        Reservation.start_time >= start_date,
        Reservation.start_time < end_date
    ).all()

    report_data = []
    for r in reservations:
        room = db.session.get(Room, r.room_id) if r.room_id else None
        requester = (r.person_in_charge or '').strip() or (r.requester.username if r.requester else 'Unknown')
        department = r.requester.department if r.requester else 'Unknown'
        report_data.append({
            'start_date': r.start_time.date().isoformat() if r.start_time else '',
            'requester': requester,
            'department': department,
            'facility': room.name if room else 'Unknown',
            'activity': r.activity_purpose,
            'contact_number': r.contact_number or ''
        })

    report_data.sort(key=lambda item: item['start_date'])

    return {
        'year': year,
        'month': month,
        'total_approved_reservations': len(report_data),
        'generated_at': datetime.now().isoformat(),
        'items': report_data,
    }

def generate_monthly_report(year=None, month=None, logger=None):
    """Generate and (optionally) log/notify admins of monthly report from booking data."""
    try:
        now = datetime.now()
        if year is None:
            year = now.year
        if month is None:
            month = now.month
        payload = _build_monthly_report_payload(year, month)
        report_data = payload['items']

        # Get all admin users and send them notifications (logging only here)
        from models import User
        admins = User.query.filter(User.role.in_(['admin', 'admin_phase1'])).all()

        report_text = f"Monthly Report - {payload['month']}/{payload['year']}\n\n"
        report_text += f"Total Approved Reservations: {len(report_data)}\n\n"

        if report_data:
            report_text += "Summary (Start Date | Requester | Department | Facility | Activity | Contact):\n"
            for item in report_data:
                report_text += (
                    f"- {item['start_date']} | {item['requester']} | {item['department']} | "
                    f"{item['facility']} | {item['activity']} | {item['contact_number']}\n"
                )

        if logger:
            logger.info(f"Monthly report generated: {len(report_data)} reservations for {payload['month']}/{payload['year']}")
            for admin in admins:
                logger.info(f"Monthly report notification sent to admin: {admin.username}")

        return report_text, report_data
    except Exception as e:
        if logger:
            logger.error(f"Failed to generate monthly report: {e}")
        return None, []


# Fixed axes used by multiple chart datasets.
DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
HOUR_LABELS = [f'{hour:02d}:00' for hour in range(6, 23)]
# Lead-time buckets in days (date filed -> event start).
LEAD_TIME_BUCKETS = [
    ('0-1 day', 0, 1),
    ('2-3 days', 2, 3),
    ('4-7 days', 4, 7),
    ('8-14 days', 8, 14),
    ('15-30 days', 15, 30),
    ('31+ days', 31, None),
]


def _safe_pct(numerator, denominator):
    # Guard against division-by-zero when there are no reservations.
    if not denominator:
        return 0.0
    return round((numerator / denominator) * 100.0, 2)


def _format_status(status):
    # Normalize raw status values to consistent display labels.
    return (status or 'unknown').replace('-', ' ').title()


def _format_month_label(month_key):
    # Convert YYYY-MM into dashboard label format (e.g., Mar 2026).
    return datetime.strptime(month_key, '%Y-%m').strftime('%b %Y')


def _last_month_keys(months):
    # Build chronological month keys ending at current month.
    now = datetime.now()
    month_keys = []
    for offset in range(months - 1, -1, -1):
        month_index = now.month - offset
        year = now.year
        while month_index <= 0:
            month_index += 12
            year -= 1
        month_keys.append(f'{year:04d}-{month_index:02d}')
    return month_keys


def _normalize_department(reservation):
    # Standardize department values so grouping remains stable.
    requester = getattr(reservation, 'requester', None)
    if requester and requester.department:
        return requester.department.strip().title()
    return 'Unknown'


def _normalize_department_value(value):
    # Normalize incoming department filter values to match grouped labels.
    return (value or '').strip().title()


def _iter_hour_slots(start_time, end_time):
    # Yield hourly slots occupied by a reservation, bounded to dashboard hours.
    if not start_time or not end_time or end_time <= start_time:
        return

    # Guard against anomalous records (e.g., accidentally very long spans) that
    # can dominate the heatmap and hide real booking patterns.
    max_hours = 24
    if (end_time - start_time) > timedelta(hours=max_hours):
        end_time = start_time + timedelta(hours=max_hours)

    current = start_time.replace(minute=0, second=0, microsecond=0)
    while current < end_time:
        if 6 <= current.hour <= 22:
            yield current.weekday(), current.hour
        current += timedelta(hours=1)


def _bucket_lead_time(days):
    # Map numeric lead-time into configured bucket label.
    for label, min_days, max_days in LEAD_TIME_BUCKETS:
        if max_days is None and days >= min_days:
            return label
        if min_days <= days <= max_days:
            return label
    return 'Unknown'


def build_analytics_snapshot(months=6, department=None, heatmap_month=None):
    """Build KPI and chart datasets for the admin analytics dashboard."""
    # Eager-load requester to avoid N+1 queries while aggregating departments.
    all_reservations = Reservation.query.options(joinedload(Reservation.requester)).all()

    available_departments = sorted({
        _normalize_department(reservation)
        for reservation in all_reservations
    })

    department_filter = _normalize_department_value(department)
    if department_filter and department_filter.lower() != 'all':
        reservations = [
            reservation
            for reservation in all_reservations
            if _normalize_department(reservation) == department_filter
        ]
    else:
        department_filter = 'All'
        reservations = all_reservations


    # Always use current year and month as default if available
    available_heatmap_month_keys = sorted({
        reservation.start_time.strftime('%Y-%m')
        for reservation in reservations
        if reservation.start_time
    }, reverse=True)

    current_month_key = datetime.now().strftime('%Y-%m')
    if heatmap_month and heatmap_month in available_heatmap_month_keys:
        selected_heatmap_month = heatmap_month
    elif current_month_key in available_heatmap_month_keys:
        selected_heatmap_month = current_month_key
    elif available_heatmap_month_keys:
        selected_heatmap_month = available_heatmap_month_keys[0]
    else:
        selected_heatmap_month = 'all'

    room_lookup = {room.id: room.name for room in Room.query.all()}

    # Accumulators used to compute KPI values and chart series in one pass.
    total = len(reservations)
    status_counter = Counter()
    room_counter = Counter()
    day_counter = Counter({day: 0 for day in DAY_LABELS})
    department_counter = Counter()
    monthly_counter = Counter()
    lead_time_counter = Counter({label: 0 for label, _, _ in LEAD_TIME_BUCKETS})
    lead_time_values = []
    heatmap_counts = {day: {hour: 0 for hour in HOUR_LABELS} for day in DAY_LABELS}

    # Single-pass aggregation over reservations for all dashboard widgets.
    for reservation in reservations:
        status_counter[_format_status(reservation.status)] += 1

        room_name = room_lookup.get(reservation.room_id, 'Unknown Venue')
        room_counter[room_name] += 1

        if reservation.start_time:
            day_label = DAY_LABELS[reservation.start_time.weekday()]
            day_counter[day_label] += 1
            monthly_counter[reservation.start_time.strftime('%Y-%m')] += 1

        department_counter[_normalize_department(reservation)] += 1

        # Expand each reservation into occupied hour slots for heatmap density.
        if reservation.start_time and reservation.end_time:
            heatmap_eligible_statuses = {'approved', 'concept-approved'}
            status_value = str(reservation.status or '').strip().lower()
            if status_value not in heatmap_eligible_statuses:
                continue

            include_in_heatmap = (
                selected_heatmap_month == 'all' or
                reservation.start_time.strftime('%Y-%m') == selected_heatmap_month
            )
            if include_in_heatmap:
                for weekday_index, hour in _iter_hour_slots(reservation.start_time, reservation.end_time) or []:
                    heatmap_counts[DAY_LABELS[weekday_index]][f'{hour:02d}:00'] += 1

        # Lead time is measured as event start minus filing timestamp.
        if reservation.date_filed and reservation.start_time:
            lead_days = (reservation.start_time - reservation.date_filed).total_seconds() / 86400
            if lead_days >= 0:
                rounded_days = round(lead_days, 1)
                lead_time_values.append(rounded_days)
                lead_time_counter[_bucket_lead_time(int(lead_days))] += 1

    top_rooms = room_counter.most_common(5)
    most_booked_venue, most_booked_venue_count = top_rooms[0] if top_rooms else ('No Data', 0)

    # Find the day/hour slot with the highest heatmap count.
    peak_usage_time = 'No Data'
    peak_usage_count = 0
    for day in DAY_LABELS:
        for hour in HOUR_LABELS:
            slot_count = heatmap_counts[day][hour]
            if slot_count > peak_usage_count:
                peak_usage_count = slot_count
                peak_usage_time = f'{day} {hour}'

    busiest_day, busiest_day_count = day_counter.most_common(1)[0] if total else ('No Data', 0)
    top_department, top_department_count = department_counter.most_common(1)[0] if total else ('No Data', 0)
    dominant_status, dominant_status_count = status_counter.most_common(1)[0] if total else ('No Data', 0)
    average_lead_time_days = round(sum(lead_time_values) / len(lead_time_values), 1) if lead_time_values else 0

    # Keep status order stable to match frontend chart labels.
    status_values = [status_counter.get(label, 0) for label in ['Pending', 'Concept Approved', 'Approved', 'Denied', 'Deleted']]
    approval_rate = _safe_pct(status_counter.get('Approved', 0), total)
    denial_rate = _safe_pct(status_counter.get('Denied', 0), total)

    month_keys = _last_month_keys(months)
    monthly_labels = [_format_month_label(key) for key in month_keys]
    monthly_values = [monthly_counter.get(key, 0) for key in month_keys]

    # Convert nested day/hour map into matrix expected by the heatmap UI.
    heatmap_matrix = [[heatmap_counts[day][hour] for hour in HOUR_LABELS] for day in DAY_LABELS]
    max_heatmap_value = max((max(row) for row in heatmap_matrix), default=0)

    return {
        'filters': {
            'departments': ['All'] + available_departments,
            'selected_department': department_filter,
            'heatmap_months': ['all'] + available_heatmap_month_keys,
            'selected_heatmap_month': selected_heatmap_month,
            'selected_heatmap_month_label': _format_month_label(selected_heatmap_month) if selected_heatmap_month != 'all' else 'All Months',
        },
        'kpis': {
            'total_reservations': total,
            'pending': status_counter.get('Pending', 0),
            'concept_approved': status_counter.get('Concept Approved', 0),
            'approved': status_counter.get('Approved', 0),
            'denied': status_counter.get('Denied', 0),
            'deleted': status_counter.get('Deleted', 0),
            'approval_rate': approval_rate,
            'denial_rate': denial_rate,
            'most_booked_venue': most_booked_venue,
            'most_booked_venue_count': most_booked_venue_count,
            'peak_usage_time': peak_usage_time,
            'peak_usage_count': peak_usage_count,
            'busiest_day': busiest_day,
            'busiest_day_count': busiest_day_count,
            'top_department': top_department,
            'top_department_count': top_department_count,
            'dominant_status': dominant_status,
            'dominant_status_count': dominant_status_count,
            'average_lead_time_days': average_lead_time_days,
            'lead_time_samples': len(lead_time_values),
        },
        'charts': {
            'top_venues': {
                'labels': [label for label, _ in top_rooms],
                'values': [value for _, value in top_rooms],
            },
            'peak_usage_heatmap': {
                'days': DAY_LABELS,
                'hours': HOUR_LABELS,
                'values': heatmap_matrix,
                'max_value': max_heatmap_value,
            },
            'reservations_over_time': {
                'labels': monthly_labels,
                'values': monthly_values,
            },
            'events_by_day_of_week': {
                'labels': DAY_LABELS,
                'values': [day_counter[day] for day in DAY_LABELS],
            },
            'reservations_by_department': {
                'labels': list(department_counter.keys()),
                'values': list(department_counter.values()),
            },
            'booking_status_overview': {
                'labels': ['Pending', 'Concept Approved', 'Approved', 'Denied', 'Deleted'],
                'values': status_values,
            },
            'average_lead_time_histogram': {
                'labels': [label for label, _, _ in LEAD_TIME_BUCKETS],
                'values': [lead_time_counter[label] for label, _, _ in LEAD_TIME_BUCKETS],
            },
        },
    }
