// Reference data — OHIP cardiology billing (specialty 60).
// Fees: MOH Schedule of Benefits master file, edition effective 2026-04-01/2026-06-02.
// Rules/combos/workflow: user-supplied institutional billing-rules cheat sheets.
// Personal reference only — verify against the current Schedule before billing.

export const CATS = [
  { key: 'consults', label: 'Consults' },
  { key: 'mrp', label: 'MRP / Subsequent' },
  { key: 'ccu', label: 'CCU / Critical' },
  { key: 'premiums', label: 'Premiums / SVP' },
  { key: 'procedures', label: 'Procedures' },
  { key: 'misc', label: 'Misc / Admin' },
];

export const CODES = [
  // ---- Consults ----
  { code: 'A605 / C605', cat: 'consults', label: 'Consultation', fee: '$188.45',
    notes: 'A-prefix = ER/office or when a premium applies. C-prefix = simple weekday ward admission, no premium.' },
  { code: 'A600 / C600', cat: 'consults', label: 'Comprehensive consultation', fee: '$342.25',
    notes: '≥75 min direct patient contact — start/stop times must be charted.' },
  { code: 'A675 / C675', cat: 'consults', label: 'Limited consultation', fee: '$105.25' },
  { code: 'A606 / C606', cat: 'consults', label: 'Repeat consultation', fee: '$105.25' },
  { code: 'A603 / C603', cat: 'consults', label: 'General assessment', fee: '$96.70',
    notes: 'Only 1 per admission, MRP only. Not billable in ICU/CCU (reserved for the ICU MRP) — bill complex (C601) + C101 instead. If not MRP, bill complex (C601).' },
  { code: 'A604 / C604', cat: 'consults', label: 'General re-assessment', fee: '$72.65',
    notes: 'Only 1 per admission. Cannot be billed if a general assessment (C603) was already billed this admission.' },
  { code: 'A601 / C601', cat: 'consults', label: 'Complex re-assessment', fee: '$84.10',
    notes: 'Used in place of C603 when not MRP, or in ICU/CCU (+ C101).' },
  { code: 'A608', cat: 'consults', label: 'Partial assessment', fee: '$49.80' },
  { code: 'C138', cat: 'consults', label: 'Minor/brief encounter ("small thing")', fee: '$40.05',
    notes: 'For a genuinely brief additional encounter — pair with the applicable time-of-day premium.' },
  { code: 'E088', cat: 'consults', label: 'CHF premium', fee: '+50%',
    notes: 'Office/outpatient only, established CHF diagnosis. Not payable inpatient, LTC, or ED.' },

  // ---- MRP / Subsequent ----
  { code: 'C122', cat: 'mrp', label: 'Subsequent visit — day 1 post-admission', fee: '$71.80',
    notes: 'MRP only, one-time per admission. Day numbering follows the date the admission/E082 was actually claimed, not necessarily the official admit date.' },
  { code: 'C123', cat: 'mrp', label: 'Subsequent visit — day 2 post-admission', fee: '$71.80',
    notes: 'MRP only, one-time per admission.' },
  { code: 'C124', cat: 'mrp', label: 'Discharge day', fee: '$71.80',
    notes: 'MRP only. Must be ≥48h after admission — if discharging sooner, bill C122 instead (same fee, so nothing is lost).' },
  { code: 'C126', cat: 'mrp', label: 'Discharge day — medically complex', fee: '$95.10',
    notes: 'See A13 criteria for "medically complex."' },
  { code: 'C121', cat: 'mrp', label: 'Intercurrent illness visit', fee: '$40.05',
    notes: 'Use in place of C607/C609 once their max is reached — only if the patient has a diagnosis other than the admitting problem (e.g. admitted for cardiac issue, develops pneumonia in hospital). No unrelated diagnosis → visit may not be billable once maxed.' },
  { code: 'C142', cat: 'mrp', label: 'Post-transfer subsequent visit — day 1', fee: '$71.80',
    notes: 'Only billable if C122 has not already been billed this admission.' },
  { code: 'C143', cat: 'mrp', label: 'Post-transfer subsequent visit — day 2', fee: '$71.80',
    notes: 'Only billable if C123 has not already been billed this admission.' },
  { code: 'C602', cat: 'mrp', label: 'Routine MRP visit — up to 5 weeks', fee: '$40.05',
    notes: '1 per day per patient per specialty. MOH will not pay a second same-day C602 once an MRP visit is already claimed.' },
  { code: 'C607', cat: 'mrp', label: 'Routine MRP visit — weeks 6–13', fee: '$40.05',
    notes: 'Max 3 per week per patient per specialty.' },
  { code: 'C609', cat: 'mrp', label: 'Routine MRP visit — 13+ weeks', fee: '$40.05',
    notes: 'Max 6 per month per patient per specialty.' },
  { code: 'C608', cat: 'mrp', label: 'Additional same-day encounter', fee: '$40.05',
    notes: 'For a genuinely separate follow-up later the same day, once a routine subsequent-visit code (C602/C607/C609) is already billed today.' },
  { code: 'E082', cat: 'mrp', label: 'Admission premium', fee: '(fixed add-on)',
    notes: 'Rides on the admission assessment itself (A605/C605 etc.) — not on C122.' },
  { code: 'E083', cat: 'mrp', label: 'MRP visit premium — weekday', fee: '+30%',
    notes: 'Add to C602/C121/C122/C123/C124/C126/C142/C143 when billed by the MRP. Do not add to C603/C601/C604 — it does not apply to those.' },
  { code: 'E084', cat: 'mrp', label: 'MRP visit premium — weekend/holiday', fee: '+45%',
    notes: 'Same eligible code list as E083, for weekend/stat visits by the MRP (day 1, day 2, and discharge all qualify). Only one of E083/E084 per patient per day.' },

  // ---- CCU / Critical ----
  { code: 'G400', cat: 'ccu', label: 'CCU per-diem — day 1', fee: '$223.10',
    notes: 'MRP only. Cannot bill admission + G400 the same day — bill whichever is worth more. Not billable after an ICU/NACU/PACU stay (bill G401 instead).' },
  { code: 'G401', cat: 'ccu', label: 'CCU per-diem — days 2–30', fee: '$146.45',
    notes: 'MRP only. Used for the day after an ICU/NACU/PACU stay in place of G400.' },
  { code: 'G402', cat: 'ccu', label: 'CCU per-diem — day 31+', fee: '$58.60',
    notes: 'MRP only.' },
  { code: 'C101', cat: 'ccu', label: 'Cardiac CCU premium', fee: '$9.10',
    notes: 'Add-on for a patient in Cardiac CCU — payable with admission, C122, C123, MRP visits (C602 etc.), discharge, C601, and C605. Not with a general assessment (C603) in CCU — use C601 + C101 instead.' },
  { code: 'G521', cat: 'ccu', label: 'Critical care — first ¼h', fee: '$125.10' },
  { code: 'G523', cat: 'ccu', label: 'Critical care — second ¼h', fee: '$64.50' },
  { code: 'G522', cat: 'ccu', label: 'Critical care — after first ½h, per ¼h', fee: '$42.50' },
  { code: 'G391', cat: 'ccu', label: '4th+ physician (life-threatening) / 2nd tier (other)', fee: '$34.35',
    notes: 'Reused code — context-dependent. Confirm which use applies.' },
  { code: 'G395', cat: 'ccu', label: 'Other/resuscitative critical care — first ¼h', fee: '$64.70',
    notes: 'Not payable same-day/same-physician alongside G521/G522/G523.' },
  { code: 'G359 / G345 / G381', cat: 'ccu', label: 'Chemotherapy administration codes', fee: '$105.15 / $75.00 / $54.50',
    notes: 'Only billable alongside G400, G401, or G390 — not with any other service.' },
  { code: 'G390', cat: 'ccu', label: 'Comprehensive care per diem', fee: '$262.40',
    notes: 'When billing G390 with Z426, use Z426A instead of Z426.' },

  // ---- Premiums / SVP ----
  { code: 'C960 / C990 / C991', cat: 'premiums', label: 'SVP, weekday day (07:00–17:00) — travel / 1st person / additional', fee: '$37.40 / $20.55 / $20.55',
    notes: 'For SVP on an existing MRP/consult (C-prefix service). Max 2 travel/day. Use the additional-person code (C991) where reasonable — MOH is strict on repeated first-person claims.' },
  { code: 'C962 / C994 / C995', cat: 'premiums', label: 'SVP, weekday evening (17:00–24:00) — travel / 1st / additional', fee: '$37.40 / $61.70 / $61.70',
    notes: 'Max 10 additional-person claims per day.' },
  { code: 'C963 / C986 / C987', cat: 'premiums', label: 'SVP, Sat/Sun/Holiday — travel / 1st / additional', fee: '$37.40 / $77.10 / $77.10',
    notes: 'Max 20 additional-person claims per day. MRP should use E084 instead of this if rounding.' },
  { code: 'C964 / C996 / C997', cat: 'premiums', label: 'SVP, night (00:00–07:00) — travel / 1st / additional', fee: '$37.40 / $102.80 / $102.80',
    notes: 'No daily max.' },
  { code: 'K960 / K990 / K991', cat: 'premiums', label: 'SVP, weekday day — ER/ward admission context', fee: '$37.40 / $20.55 / $20.55',
    notes: 'K-prefix = admitting from ER, or admitting on the ward when a premium applies (pairs with A605, not C605).' },
  { code: 'K962 / K994 / K995', cat: 'premiums', label: 'SVP, weekday evening — ER/ward admission context', fee: '$37.40 / $61.70 / $61.70' },
  { code: 'K963 / K998 / K999', cat: 'premiums', label: 'SVP, Sat/Sun/Holiday — ER/ward admission context', fee: '$37.40 / $77.10 / $77.10' },
  { code: 'K964 / K996 / K997', cat: 'premiums', label: 'SVP, night — ER/ward admission context', fee: '$37.40 / $102.80 / $102.80' },
  { code: 'E082', cat: 'premiums', label: 'Admission premium', fee: '(see MRP)',
    notes: 'On the admission assessment itself.' },
  { code: 'E409', cat: 'premiums', label: 'After-hours procedure premium — evening/weekend', fee: '+50%',
    notes: 'Added to the procedure fee itself, not to sedation codes (e.g. G379).' },
  { code: 'E410', cat: 'premiums', label: 'After-hours procedure premium — night', fee: '+75%' },

  // ---- Procedures ----
  { code: 'Z439', cat: 'procedures', label: 'Right heart cath — pressures only', fee: '$166.90' },
  { code: 'Z440', cat: 'procedures', label: 'Left heart cath — retrograde aortic', fee: '$208.50' },
  { code: 'Z441', cat: 'procedures', label: 'Left heart cath — transeptal', fee: '$297.15' },
  { code: 'Z442', cat: 'procedures', label: 'Selective coronary catheterization, both arteries', fee: '$286.75' },
  { code: 'G297', cat: 'procedures', label: 'Angiogram (max 2 — one per right/left heart cath)', fee: '$117.55' },
  { code: 'G509', cat: 'procedures', label: 'Bypass graft angiogram (max 1/graft)', fee: '$80.40' },
  { code: 'G263', cat: 'procedures', label: '+ other drug interventional studies', fee: '+$96.45',
    notes: 'Exempt from the multi-procedure 50% reduction.' },
  { code: 'Z434', cat: 'procedures', label: 'Angioplasty — single major vessel', fee: '$467.05' },
  { code: 'G262', cat: 'procedures', label: '+ each additional major vessel', fee: '+$210.40',
    notes: 'Exempt from the multi-procedure 50% reduction.' },
  { code: 'G298', cat: 'procedures', label: 'Coronary stent, per stent', fee: '$78.95' },
  { code: 'G296', cat: 'procedures', label: 'Dye dilution / thermal dilution studies', fee: '$110.95' },
  { code: 'G299', cat: 'procedures', label: 'Oximetry studies', fee: '$110.95' },
  { code: 'G289', cat: 'procedures', label: 'Fick determination', fee: '$110.95' },
  { code: 'G115 + Z437', cat: 'procedures', label: 'Cardioversion', fee: '$46.30 + $92.45' },
  { code: 'G269', cat: 'procedures', label: 'Central line insertion', fee: '$31.25' },
  { code: 'C268', cat: 'procedures', label: 'Arterial line insertion', fee: '$40.05' },
  { code: 'Z459', cat: 'procedures', label: 'Arterial blood gas (ABG)', fee: '$10.20' },
  { code: 'Z443', cat: 'procedures', label: 'Transvenous pacing', fee: '$154.10',
    notes: 'Add central line (G269) if inserted for the purpose.' },
  { code: 'Z438', cat: 'procedures', label: 'Swan-Ganz catheter insertion', fee: '$162.50' },
  { code: 'Z401', cat: 'procedures', label: 'Pericardiocentesis', fee: '$131.70' },
  { code: 'Z331', cat: 'procedures', label: 'Thoracocentesis', fee: '$37.35' },
  { code: 'Z403 / Z408', cat: 'procedures', label: 'Additional cardiac procedure codes', fee: '$133.55 / $80.80',
    notes: 'Allowed alongside other visits same day. Confirm exact description/indication in the current Schedule.' },
  { code: 'Z426 / Z426A', cat: 'procedures', label: 'Cardiac procedure code', fee: '$62.55',
    notes: 'Use the "A" suffix variant (Z426A) when billed together with G390.' },

  // ---- Misc / Admin ----
  { code: 'K002', cat: 'misc', label: 'Family/counselling meeting', fee: '$80.00',
    notes: 'Inpatient exception: can be billed same-day with a visit/C602, but not with admission/C122/C123/C124 unless times are documented (triggers manual review).' },
  { code: 'K013 / K014 / K015', cat: 'misc', label: 'Counselling', fee: '$80.00',
    notes: 'Must be billed alone — no other service same day. If another service applies same day, bill whichever is worth more (inpatient: use K002 alongside a visit instead).' },
  { code: 'K121', cat: 'misc', label: 'Inpatient counselling add-on', fee: '$37.05',
    notes: 'Allowed with inpatient visits — limits apply.' },
  { code: 'K731', cat: 'misc', label: 'Telephone advice', fee: '$47.75',
    notes: 'Not billable if the patient was accepted and consulted. Must be billed alone like other telephone consults — bill whichever is worth more if another service applies same day.' },
  { code: 'K738 / K739', cat: 'misc', label: 'E-consult — referring / consultant physician', fee: '$16.45 / $20.50',
    notes: 'Fax/email consult. Include patient name, OHIP #, MRN, date, and referring physician.' },
  { code: 'K035', cat: 'misc', label: 'Driving/medical form', fee: '$36.25' },
  { code: 'A777 / C777', cat: 'misc', label: 'Death + certificate', fee: '$44.55' },
  { code: '', cat: 'misc', label: 'One service per day, generally', fee: '',
    notes: 'Multiple same-day services aren\'t normally payable. Admission is an exception. Cardio may bill multiple procedures same day if applicable. Can\'t bill admission + G400 same day — bill whichever is worth more.' },
  { code: '', cat: 'misc', label: 'Admission date vs. claim date', fee: '',
    notes: 'The admission may be claimed within 24h of actual admission. Day-1/day-2 numbering follows the date E082 was actually claimed, not the official admit date, if they differ.' },
  { code: '', cat: 'misc', label: 'Discharge 48h rule', fee: '',
    notes: 'C124 requires ≥48h since admission. If discharging sooner, bill C122 for that day instead (same fee — nothing lost).' },
  { code: '', cat: 'misc', label: 'Co-signing charges', fee: '',
    notes: 'Charges must be co-signed to drop into the billing queue for submission — check weekly that entered charges have dropped.' },
  { code: '', cat: 'misc', label: 'Referring physician', fee: '',
    notes: 'Always enter the referring physician for a consult.' },
];

// ---- Same-day cross-check config (Ask mode, part 2) ----

// Codes capped at one encounter per patient per day — a same-day repeat
// swaps to the "additional encounter" alternative. (C603/C604 are actually
// capped per-admission, not just per-day — flagged separately in the app.)
export const DAILY_LIMIT_CODES = ['C602', 'C607', 'C609', 'C121', 'C603', 'C604'];
export const DAILY_LIMIT_ALT = 'C608';
export const PER_ADMISSION_CODES = ['C603', 'C604'];

// SVP "first person seen" / "additional person(s) seen" pairs by time-of-day
// block, for both the inpatient (C-prefix) and ER/ward-admission (K-prefix)
// contexts.
export const SVP_TIME_BLOCKS = [
  { id: 'day', label: 'weekday day (07:00–17:00)', first: 'C990', additional: 'C991' },
  { id: 'eve', label: 'weekday evening (17:00–24:00)', first: 'C994', additional: 'C995' },
  { id: 'weekend', label: 'Sat/Sun/Holiday', first: 'C986', additional: 'C987' },
  { id: 'night', label: 'night (00:00–07:00)', first: 'C996', additional: 'C997' },
];

// K-prefix equivalents used when admitting from ER / on the ward with a premium.
export const K_PREFIX_ADDITIONAL = {
  K990: 'K991',
  K994: 'K995',
  K998: 'K999',
  K996: 'K997',
};

export const DISCLAIMER =
  'Personal reference only — always verify current codes, fees, and rules against the OHIP Schedule of Benefits before billing.';
