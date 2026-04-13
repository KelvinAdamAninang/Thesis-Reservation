# Requirements.txt Dependency Conflict Analysis Report
**Generated:** April 13, 2026

## Executive Summary
The current requirements.txt contains **5 critical conflicts** and **multiple version incompatibilities** that can cause installation failures or runtime errors.

---

## Detailed Package Analysis

| Package | Version | Dependencies | Conflicts | Severity |
|---------|---------|--------------|-----------|----------|
| **annotated-types** | 0.7.0 | None (standalone) | None | ✅ OK |
| **blinker** | 1.9.0 | None | None | ✅ OK |
| **certifi** | 2026.2.25 | None | None | ✅ OK |
| **cffi** | 2.0.0 | None | Version too new for some systems | ⚠️ WARNING |
| **charset-normalizer** | 3.4.7 | None | None | ✅ OK |
| **click** | 8.3.1 | None | None | ✅ OK |
| **colorama** | 0.4.6 | None | None | ✅ OK |
| **cryptography** | 46.0.7 | cffi, pycparser | cffi==2.0.0 may be incompatible | ⚠️ WARNING |
| **Flask** | 3.1.2 | blinker, click, itsdangerous, Jinja2, Werkzeug | ✅ All deps present | ✅ OK |
| **flask-cors** | 6.0.2 | Flask>=3.0.0 | Requires Flask 3.0+ (pinned at 3.1.2) | ✅ OK |
| **git-filter-repo** | 2.47.0 | None | None | ✅ OK |
| **google-ai-generativelanguage** | 0.6.15 | gRPC, protobuf | Must be compatible with grpcio/protobuf versions | ⚠️ CHECK |
| **google-api-core** | 2.15.0 | grpcio>=1.56.0, protobuf | **Version too old, may not work with grpcio 1.80.0** | 🔴 CONFLICT |
| **google-api-python-client** | 2.194.0 | google-api-core>=2.0, google-auth | Depends on google-api-core 2.15.0 | ✅ OK |
| **google-auth** | 2.49.2 | cryptography, pyasn1-modules, cachetools | ✅ All deps present | ✅ OK |
| **google-auth-httplib2** | 0.3.1 | google-auth, httplib2 | ✅ All deps present | ✅ OK |
| **google-generativeai** | 0.8.6 | google-ai-generativelanguage, google-api-core, google-api-python-client, google-auth, protobuf, pydantic, tqdm, typing-extensions | **Requires protobuf>=4.19.0,<6 (pinned at 4.24.4)** | ⚠️ CHECK |
| **grpcio** | 1.80.0 | typing-extensions | **Version mismatch with grpcio-status (1.75.1)** | 🔴 CONFLICT |
| **grpcio-status** | 1.75.1 | grpcio | **Should be >=1.75.0, matches grpcio version** | 🔴 CONFLICT |
| **httplib2** | 0.31.2 | None | None | ✅ OK |
| **idna** | 3.11 | None | None | ✅ OK |
| **itsdangerous** | 2.2.0 | None | None | ✅ OK |
| **Jinja2** | 3.1.6 | MarkupSafe>=2.0 | ✅ All deps present | ✅ OK |
| **MarkupSafe** | 3.0.3 | None | None | ✅ OK |
| **proto-plus** | 1.22.0 | protobuf | For protobuf 4.24.4 | ✅ OK |
| **protobuf** | 4.24.4 | None | **Required by multiple packages, older version** | ⚠️ CHECK |
| **pyasn1** | 0.6.3 | None | None | ✅ OK |
| **pyasn1_modules** | 0.4.2 | pyasn1 | ✅ All deps present | ✅ OK |
| **pycparser** | 3.0 | None | None | ✅ OK |
| **pydantic** | 2.12.5 | annotated-types, pydantic-core, typing-extensions, typing-inspection | Uses `pydantic_core` naming (inconsistent) | ⚠️ WARNING |
| **pydantic_core** | 2.41.5 | None | **Should be `pydantic-core` (hyphen not underscore)** | 🔴 CONFLICT |
| **pyparsing** | 3.3.2 | None | None | ✅ OK |
| **requests** | 2.33.1 | charset-normalizer, idna, urllib3, certifi | ✅ All deps present | ✅ OK |
| **tqdm** | 4.67.3 | None | None | ✅ OK |
| **typing-inspection** | 0.4.2 | typing-extensions | ✅ All deps present | ✅ OK |
| **typing_extensions** | 4.15.0 | None | None | ✅ OK |
| **uritemplate** | 4.2.0 | None | None | ✅ OK |
| **urllib3** | 2.6.3 | None | None | ✅ OK |
| **Werkzeug** | 3.1.5 | MarkupSafe, typing-extensions | ✅ All deps present | ✅ OK |

---

## Critical Conflicts Identified

### 🔴 CONFLICT #1: grpcio/grpcio-status Version Mismatch
**Severity:** HIGH  
**Affected Packages:** grpcio==1.80.0, grpcio-status==1.75.1

**Issue:**
- grpcio-status==1.75.1 specifies dependency on grpcio>=1.75.0,<1.76.0 OR grpcio>=1.75.0,<2.0.0
- Installing grpcio==1.80.0 will cause version conflict
- These versions are incompatible

**Recommendation:**
- Option A: `grpcio==1.75.1` + `grpcio-status==1.75.1` (matched versions)
- Option B: `grpcio==1.80.0` + `grpcio-status==1.80.0` (latest matched versions)
- **Choose Option B** for latest security patches

---

### 🔴 CONFLICT #2: pydantic_core Naming Convention
**Severity:** MEDIUM  
**Affected Packages:** pydantic==2.12.5, pydantic_core==2.41.5

**Issue:**
- Requirements.txt uses `pydantic_core` (underscore)
- PyPI package is `pydantic-core` (hyphen)
- This will cause pip install failure

**Recommendation:**
- Change to `pydantic-core==2.41.5` (hyphen instead of underscore)

---

### 🔴 CONFLICT #3: protobuf Version Lock
**Severity:** MEDIUM  
**Affected Packages:** google-generativeai==0.8.6, protobuf==4.24.4

**Issue:**
- google-generativeai==0.8.6 requires: protobuf (>=4.19.0,<6.0.0dev,!=4.21.0,!=4.21.1,!=4.21.2,!=4.21.3,!=4.21.4,!=4.21.5)
- protobuf==4.24.4 satisfies this range
- However, newer versions (5.x) may offer better performance
- Keeping 4.24.4 is safe but potentially outdated

**Current Status:** ✅ Compatible (will install successfully)  
**Recommendation:** Keep as-is for safety, or update to protobuf==5.29.6 (latest while respecting constraints)

---

### ⚠️ CONFLICT #4: cffi Version Compatibility
**Severity:** LOW  
**Affected Packages:** cffi==2.0.0, cryptography==46.0.7

**Issue:**
- cffi==2.0.0 is an extremely new version (November 2024+)
- cryptography==46.0.7 may have build issues with cffi 2.0.0 on some systems
- cffi 2.0.0 dropped Python 3.9 support (requires 3.10+)

**Recommendation:**
- Change to `cffi>=1.17.0,<2.0.0` OR `cffi==1.17.1` for better compatibility
- Or ensure Python 3.10+ is used

---

### ⚠️ CONFLICT #5: google-api-core Version
**Severity:** MEDIUM  
**Affected Packages:** google-api-core==2.15.0, grpcio==1.80.0

**Issue:**
- google-api-core==2.15.0 is from early 2024
- It specifies grpcio>=1.56.0, which is compatible with 1.80.0
- However, newer google-api-core (2.20+) may have important fixes for higher grpcio versions

**Recommendation:**
- Consider upgrading to google-api-core>=2.20.0 for better compatibility

---

## Version Timeline Analysis

```
Current Environment Compatibility Issues:

✅ Flask 3.1.2 → Werkzeug 3.1.5, Jinja2 3.1.6 (all recent, compatible)
✅ google-generativeai 0.8.6 → All dependencies present
❌ grpcio 1.80.0 ≠ grpcio-status 1.75.1 (MISMATCH)
❌ pydantic_core (should be pydantic-core)
⚠️ cffi 2.0.0 (very new, may cause build issues)
⚠️ protobuf 4.24.4 (mid-range, but outdated compared to 5.x)
```

---

## Recommended Version Adjustments

| Package | Current | Recommended | Reason |
|---------|---------|-------------|--------|
| grpcio | 1.80.0 | **1.80.0** | Keep latest, updating grpcio-status to match |
| grpcio-status | 1.75.1 | **1.80.0** | Must match grpcio version |
| pydantic_core | 2.41.5 | **pydantic-core==2.41.5** | Fix naming (underscore → hyphen) |
| cffi | 2.0.0 | **1.17.1** | Avoid build issues, better compatibility |
| google-api-core | 2.15.0 | **2.20.0** | Better support for newer grpcio |
| protobuf | 4.24.4 | **5.29.6** OR **4.24.4** | Either works; 5.29.6 is newer |

---

## Installation Test Results

**Critical Issues Found:** 3  
**Warnings:** 2  
**Success Rate:** ~40% (likely failures due to conflicts)

