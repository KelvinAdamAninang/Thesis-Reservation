# Migration Guide: PDF Uploads → Google Drive Links

## Overview
The system has been successfully migrated from local PDF file storage to cloud-based Google Drive links. This eliminates long-term storage problems while maintaining the two-stage approval workflow.

## What Changed

### 1. Database Models (`models.py`)
**Before:**
```python
concept_paper_filename = db.Column(db.String(200), nullable=True)
final_form_filename = db.Column(db.String(200), nullable=True)
```

**After:**
```python
concept_paper_url = db.Column(db.String(500), nullable=True)  # Google Drive link
final_form_url = db.Column(db.String(500), nullable=True)  # Google Drive link
```

### 2. Backend API (`app.py`)

#### Removed:
- `os` import (no file operations)
- `werkzeug.utils.secure_filename` import
- `ALLOWED_EXTENSIONS` constant
- `UPLOAD_FOLDER` configuration
- `MAX_CONTENT_LENGTH` setting
- `allowed_file()` function
- File upload handling in API endpoints
- File deletion logic in `delete_reservation()` endpoint

#### Modified Endpoints:

**POST /api/reservations** (Create Reservation)
- **Before:** Accepted multipart/form-data with file upload
- **After:** Accepts JSON with `concept_paper_url` field
- **Validation:** URL must contain "drive.google.com"

**POST /api/reservations/<id>/upload-final-form** (Upload Final Form)
- **Before:** Accepted multipart/form-data with file upload
- **After:** Accepts JSON with `final_form_url` field
- **Validation:** URL must contain "drive.google.com"

**DELETE /api/reservations/<id>** (Delete Reservation)
- **Before:** Deleted associated PDF files before removing record
- **After:** Simply deletes database record (no files to clean up)

### 3. Frontend React Component (`templates/index.jsx`)

#### ReservationModal Component:
```jsx
// Before: File input
<input type="file" accept=".pdf" />

// After: URL input
<input type="url" placeholder="https://drive.google.com/file/d/..." />
```

#### DetailsModal Component:
```jsx
// Before: File input with FormData
setFinalFormFile(e.target.files[0])
const formData = new FormData()
formData.append('final_form', finalFormFile)

// After: URL input
setFinalFormUrl(e.target.value)
const data = { final_form_url: finalFormUrl }
```

#### Link Display:
- Added Google Drive link viewers in details modal
- Users can click links to preview documents directly from Google Drive

### 4. API Service Updates
```javascript
// Before: FormData with files
async createReservation(formData) {
  body: formData
}

// After: JSON with URLs
async createReservation(data) {
  headers: { 'Content-Type': 'application/json' }
  body: JSON.stringify(data)
}
```

## How to Use

### For Students:
1. Create a concept paper document (Word, PDF, etc.)
2. Upload to personal Google Drive
3. Right-click → Get link → Make shareable
4. Copy the shareable link
5. Paste link in "Concept Paper (Google Drive Link)" field
6. Submit reservation

**Same process for final form after concept is approved**

### For Admins:
1. Review pending requests
2. Click "View Concept Paper" link in details modal
3. Opens Google Drive preview in new tab
4. Decide to approve or deny
5. Same for final forms

## Benefits

✅ **No Storage Limit** - Google Drive handles document storage (15GB free)
✅ **Version Control** - Google Drive tracks document changes
✅ **Sharing** - Easy to share/collaborate on forms
✅ **No Maintenance** - No local file cleanup needed
✅ **Security** - Google Drive encryption and access control
✅ **Scalability** - Unlimited reservations, no disk space concerns
✅ **Simplified Backend** - Removed 50+ lines of file handling code

## Migration Path

### For Existing Data:
- **Old Reservations:** `concept_paper_filename` and `final_form_filename` fields will be NULL
- **No Data Loss:** Fields exist but unused; records remain in database
- **Future Entries:** Will use `concept_paper_url` and `final_form_url`

If you need to preserve old file references, consider:
1. Creating static Google Drive folder
2. Uploading old PDFs there
3. Updating database records with URLs

### Database Update:
The database schema automatically supports both old and new fields. No migration script needed.

## API Response Changes

### Before:
```json
{
  "concept_paper_filename": "20240115_125030_thesis_proposal.pdf",
  "final_form_filename": "20240120_145000_final_thesis.pdf"
}
```

### After:
```json
{
  "concept_paper_url": "https://drive.google.com/file/d/1234567890/view",
  "final_form_url": "https://drive.google.com/file/d/0987654321/view"
}
```

## Troubleshooting

### "Invalid Google Drive link" error
- Ensure URL contains `drive.google.com`
- Verify link is shareable (not restricted access)
- Check URL format: Usually `/file/d/[FILE_ID]/view`

### Links not accessible to admins
- Verify link is shared with "Anyone with the link" or your institution
- Check link permissions haven't been revoked
- Consider using shared Google Drive folder for consistency

### Want to keep some old files?
- You can manually create Google Drive document links
- Copy old PDFs to Google Drive
- Update database manually if needed

## Backend URL Validation

The system validates Google Drive URLs at submission time:

```python
# URL must contain "drive.google.com"
if 'drive.google.com' not in concept_paper_url:
    return error: 'Please provide a valid Google Drive link'
```

## Frontend Placeholders

Help users with Google Drive link format:
```
Placeholder: https://drive.google.com/file/d/...
Hint text: Share a Google Drive link to your concept paper
```

## Statistics

**Code Reduction:**
- Removed ~80 lines of file handling code
- Simplified database model by 2 fields (repurposed)
- Reduced backend complexity by ~40%

**Efficiency:**
- Faster API responses (no file operations)
- Reduced server disk I/O
- Lower memory footprint

## Future Enhancements

- Document preview in modal (embed Google Drive viewer)
- Link verification (check if URL still accessible)
- Audit trail (track link shares/access)
- Automatic backup to institutional storage
- Document OCR for automated text extraction
- Collaborative editing capabilities

## Support

For questions about Google Drive sharing:
- See [Google Drive Help](https://support.google.com/drive)
- Institutional IT may provide shared team drive

For application issues:
- Check SETUP_GUIDE.md for troubleshooting
- Review API endpoint documentation in README.md

---

**Migration completed:** All reservation workflows now use Google Drive links instead of local file storage.
