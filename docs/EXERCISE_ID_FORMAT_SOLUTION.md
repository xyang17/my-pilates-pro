# Exercise ID Format & Weight Unit Solution

## 🔑 Your Exercise ID Format: MAT00001

**Good news:** Very well organized! ✅  
**Issue:** Database needs UUID format, not alphanumeric codes

---

## 🤔 The Problem

### What you provided:
```
MAT00001 (readable, organized abbreviation + 5 digits)
MAT00002
MAT00003
```

### What database expects:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890 (UUID format)
e5f6a1b2-c3d4-e5f6-7890-abcd-ef1234567890
c3d4e5f6-a1b2-c3d4-e5f6-7890abcdef12
```

**Why?** Database primary key `id` is defined as `UUID PRIMARY KEY DEFAULT gen_random_uuid()`

---

## ✅ SOLUTION: Use Two Fields

### Recommended Approach

Keep **BOTH** your format AND UUIDs:

| Field | Purpose | Format | Example |
|-------|---------|--------|---------|
| **exerciseCode** | Reference code (for you) | Abbreviation + digits | MAT00001, REF00001 |
| **exerciseId** | Database unique ID | UUID | a1b2c3d4-e5f6-7890-... |

---

## 🚀 Implementation

### Step 1: Add exerciseCode to Your File

Update your Excel with:
```
exerciseCode | exerciseId | nameEN | nameCN | ...
MAT00001     | (empty)    | Rolling Like a Ball | 像球一样滚动 | ...
MAT00002     | (empty)    | Pilates Push-up | 普拉提俯卧撑 | ...
REF00001     | (empty)    | Reformer Hundred | 百次 | ...
```

**Leave exerciseId empty** → System auto-generates UUID

### Step 2: Update Database Schema

Add new column to `master_exercise` table:

```sql
ALTER TABLE master_exercise ADD COLUMN exercise_code VARCHAR(50) UNIQUE;
```

### Step 3: Update Import API

When importing:
```typescript
const exercise = {
  // exerciseId left empty → system generates UUID
  exercise_code: row.exerciseCode, // e.g., "MAT00001"
  name_en: row.nameEN,
  name_cn: row.nameCN,
  // ... other fields
}
```

---

## 📊 File Status

**Current file:** `Exercise_Import_Chinese_v2_WITH_IDS_UPDATED.xlsx`

| Column | Status | Notes |
|--------|--------|-------|
| exerciseId | ⏳ TODO | Change to exerciseCode (your format) |
| defaultWeightUnitCN | ✅ ADDED | Chinese translations: 公斤, 磅, 自重, 弹簧 |
| All other columns | ✅ READY | Complete and bilingual |

---

## 💪 Weight Unit Chinese Translations

**Already added to file:**

| English | Chinese | Usage |
|---------|---------|-------|
| kg | 公斤 | Kilogram (metric) |
| lbs | 磅 | Pounds |
| bodyweight | 自重 | Using own body weight |
| spring | 弹簧 | Reformer spring resistance |

---

## 🎯 Quick Checklist

- [x] Exercise IDs filled in (MAT00001 format) ✅
- [x] Weight unit Chinese translation added ✅
- [ ] Rename exerciseId column → exerciseCode
- [ ] Leave exerciseId empty for system to auto-generate UUID
- [ ] Update database schema (add exercise_code column)
- [ ] Update import API (handle both fields)

---

## 📝 Example: Final Ready-to-Import File

```
exerciseCode | exerciseId | nameEN | nameCN | typeEN | typeCN | defaultWeight | defaultWeightUnit | defaultWeightUnitCN | ...
MAT00001     | (empty)    | Rolling Like a Ball | 像球一样滚动 | Pilates Mat | 普拉提垫上 | null | bodyweight | 自重 | ...
MAT00002     | (empty)    | Pilates Push-up | 普拉提俯卧撑 | Pilates Mat | 普拉提垫上 | null | bodyweight | 自重 | ...
REF00001     | (empty)    | Hundreds | 百次 | Pilates Reformer | 普拉提改革机 | 1 | spring | 弹簧 | ...
```

---

## ❓ FAQ

**Q: Why not just use MAT00001 as the ID?**  
A: Databases use UUIDs for distributed systems (multiple trainers, cloud sync). Your code is perfect for reference but UUID is needed as primary key.

**Q: Can I use exerciseCode to look up exercises?**  
A: Yes! We'll create both lookup methods:
- By UUID (database): Fast, internal
- By exerciseCode (API): User-friendly, for trainers

**Q: Will clients see the exerciseCode?**  
A: Only in admin/trainer interface. Clients see exercise names in their language.

**Q: What if I want to change MAT to something else?**  
A: Easy! Just update the exerciseCode. UUID stays the same (hidden from you).

---

## 🔄 Next Actions

1. **Rename column:** Change `exerciseId` → `exerciseCode` in your file
2. **Keep exerciseId empty:** For system to auto-generate UUIDs
3. **Verify weight units:** Check sample rows show correct Chinese translations
4. **Ready to import:** Once database schema is updated

---

**Your format is great!** Just need to add the UUID layer underneath. 💪

