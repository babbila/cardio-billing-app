// Free-text/voice situation parsing ("Ask" mode) and same-day cross-checking.
// Depends on globals from data.js (CODES, DAILY_LIMIT_CODES, DAILY_LIMIT_ALT,
// PER_ADMISSION_CODES, SVP_TIME_BLOCKS, K_PREFIX_ADDITIONAL) — load data.js first.

function codeInfo(code) {
  return CODES.find((c) => c.code.split(' / ').some((part) => part === code));
}

function has(text, ...words) {
  return words.some((w) => text.includes(w));
}

function detectTimeBlock(text) {
  if (has(text, 'night', 'overnight', 'middle of the night', '3am', '2am', '1am', '4am', '12am', 'after midnight', 'midnight')) {
    return { id: 'night', assumed: false };
  }
  if (has(text, 'weekend', 'saturday', 'sunday', 'holiday', 'stat')) {
    return { id: 'weekend', assumed: false };
  }
  if (has(text, 'evening', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm', 'after clinic', 'after hours', 'after-hours')) {
    return { id: 'eve', assumed: false };
  }
  const militaryMatch = text.match(/\b([01]\d|2[0-3])([0-5]\d)\b/);
  if (militaryMatch) {
    const h24 = parseInt(militaryMatch[1], 10);
    if (h24 >= 0 && h24 < 7) return { id: 'night', assumed: false };
    if (h24 >= 17) return { id: 'eve', assumed: false };
    return { id: 'day', assumed: false };
  }
  const hourMatch = text.match(/\b([01]?\d|2[0-3])(?::[0-5]\d)?\s*(am|pm)?\b/);
  if (hourMatch) {
    let h24 = parseInt(hourMatch[1], 10);
    const ampm = hourMatch[2];
    if (ampm === 'pm' && h24 < 12) h24 += 12;
    if (ampm === 'am' && h24 === 12) h24 = 0;
    if (h24 >= 0 && h24 < 7) return { id: 'night', assumed: false };
    if (h24 >= 17) return { id: 'eve', assumed: false };
  }
  return { id: 'day', assumed: true };
}

/**
 * Heuristic keyword parse of a free-text billing situation.
 * Returns { code, catKey, rationale: string[], assumptions: string[], addOns: {code, why}[], timeBlock }
 */
function parseSituation(rawText) {
  const text = (rawText || '').toLowerCase();
  const rationale = [];
  const assumptions = [];
  const addOns = [];

  if (!text.trim()) {
    return { code: null, catKey: null, rationale: [], assumptions: [], addOns: [] };
  }

  const timeBlock = detectTimeBlock(text);
  const isViaEr = has(text, 'from er', 'in the er', 'emergency department', 'admit from er', 'admitting from er', 'er consult', 'ed consult', 'from ed', 'in the ed', ' ed ', 'ed admission', 'emerg consult');
  const isViaWard = has(text, 'on the ward', 'ward admission', 'admitting on the ward', 'floor admission');
  const isCallback = has(text, 'called in', 'called back', 'callback', 'call back', 'came in from home', 'paged and went in', 'paged in');
  const isElectiveOrRounds = has(text, 'rounds', 'routine rounds', 'elective admission', 'scheduled admission');
  const isReassess = has(text, 'reassess', 're-assess', 'reassessment', 're-assessment');
  const isSecondPatient = has(text, '2nd patient', 'second patient', 'another patient', 'additional patient', 'other patient', '2nd person', 'second person');
  const isCcuAcute = has(text, 'crashing', 'coding', 'life-threatening', 'life threatening', 'resuscitat', 'arrest', 'unstable and critical');
  const isCcuPerDiem = has(text, 'ccu', 'icu', 'coronary care', 'critical care unit', 'cardiac icu');
  const isPostIcuTransfer = has(text, 'transfer from icu', 'transferred from ccu', 'stepped down', 'transferred out of ccu', 'post-icu', 'post icu', 'out of ccu', 'out of icu');
  const isCcuTransferIn = has(text, 'transfer to ccu', 'transferred to ccu', 'transfer to icu', 'transferred to icu', 'moved to ccu', 'moved to icu', 'admitted to ccu', 'admission to ccu', 'ccu admission', 'ccu transfer');
  const isStemiPci = has(text, 'stemi', 'primary pci', 'pci', 'stent', 'angioplasty', 'cath lab', 'cardiac cath', 'coronary intervention');
  const isDischarge = has(text, 'discharge');
  const isDay1 = has(text, 'day 1', 'day one', 'first day', 'first hospital day');
  const isDay2 = has(text, 'day 2', 'day two', 'second day');
  const isDay3 = has(text, 'day 3', 'day three', 'third day');
  const isNewAdmission = has(text, 'new admission', 'admitted', 'admission', 'admitting', 'new consult');
  const isConsult = has(text, 'consult', 'consultation', 'referred', 'referral');
  const isComprehensive = has(text, '75 min', '75-minute', 'comprehensive', 'over an hour');
  const isOutpatientChf = has(text, 'outpatient', 'office', 'clinic follow-up', 'clinic followup') && has(text, 'chf', 'heart failure');
  const isCardioversion = has(text, 'cardiovert', 'cardioversion');
  const isCentralLine = has(text, 'central line');
  const isArtLine = has(text, 'arterial line', 'art line', 'a-line');
  const isAbg = has(text, 'abg', 'blood gas');
  const isTvPacing = has(text, 'transvenous pac', 'tv pacing', 'temporary pacing');
  const isSwan = has(text, 'swan', 'swan-ganz', 'pulmonary artery catheter');
  const isPericardiocentesis = has(text, 'pericardiocentesis');
  const isThoracocentesis = has(text, 'thoracocentesis');
  const isCounselling = has(text, 'counselling', 'counseling', 'family meeting');
  const isTelephoneAdvice = has(text, 'telephone advice', 'phone advice', 'phoned in advice');
  const isEconsult = has(text, 'e-consult', 'econsult', 'fax consult', 'email consult');
  const isDrivingForm = has(text, 'driving form', 'medical form', 'fitness to drive');
  const isDeathCert = has(text, 'death certificate', 'pronounced death', 'patient died');

  let code = null;
  let catKey = null;

  if (isDeathCert) {
    code = 'A777/C777'; catKey = 'misc';
    rationale.push('Death and certificate completion described → A777/C777.');
  } else if (isDrivingForm) {
    code = 'K035'; catKey = 'misc';
    rationale.push('Driving/medical form described → K035.');
  } else if (isEconsult) {
    code = 'K738/K739'; catKey = 'misc';
    rationale.push('Fax/email e-consult described → K738 (referring physician) / K739 (consultant). Include patient name, OHIP #, MRN, date, and referring physician.');
  } else if (isTelephoneAdvice) {
    code = 'K731'; catKey = 'misc';
    rationale.push('Telephone advice described → K731. Not billable if the patient was accepted and consulted; must be billed alone.');
  } else if (isCounselling) {
    code = 'K002'; catKey = 'misc';
    rationale.push('Family meeting/counselling on an inpatient → K002, billable alongside a visit/C602 (not with admission/C122/C123/C124 unless times are documented).');
  } else if (isCardioversion) {
    code = 'G115/Z437'; catKey = 'procedures';
    rationale.push('Cardioversion described → G115 + Z437.');
  } else if (isTvPacing) {
    code = 'Z443'; catKey = 'procedures';
    rationale.push('Transvenous pacing described → Z443.');
    addOns.push({ code: 'G269', why: 'if a central line was inserted for the purpose' });
  } else if (isSwan) {
    code = 'Z438'; catKey = 'procedures';
    rationale.push('Swan-Ganz catheter described → Z438.');
  } else if (isPericardiocentesis) {
    code = 'Z401'; catKey = 'procedures';
    rationale.push('Pericardiocentesis described → Z401.');
  } else if (isThoracocentesis) {
    code = 'Z331'; catKey = 'procedures';
    rationale.push('Thoracocentesis described → Z331.');
  } else if (isCentralLine) {
    code = 'G269'; catKey = 'procedures';
    rationale.push('Central line insertion described → G269.');
  } else if (isArtLine) {
    code = 'C268'; catKey = 'procedures';
    rationale.push('Arterial line insertion described → C268.');
  } else if (isAbg) {
    code = 'Z459'; catKey = 'procedures';
    rationale.push('Arterial blood gas described → Z459.');
  } else if (isStemiPci) {
    code = 'Z434'; catKey = 'procedures';
    rationale.push('Coronary intervention described → Z434 (angioplasty, single major vessel) as the base code.');
    addOns.push({ code: 'G298', why: 'per stent placed' });
    addOns.push({ code: 'G262', why: 'if more than one major vessel was treated' });
    if (isCallback || timeBlock.id !== 'day') {
      addOns.push({ code: 'E409/E410', why: 'after-hours procedure premium if non-elective and outside daytime hours — applies to G262/G298; Z434 itself is a grey area, confirm with billing office' });
    }
    assumptions.push('Assumed this was a coronary (not structural/EP) procedure based on the wording used.');
  } else if (isCcuTransferIn) {
    code = 'G400'; catKey = 'ccu';
    rationale.push('Ward patient assessed and transferred into Cardiac CCU the same day → that day is CCU day 1, so G400 (not the routine ward subsequent visit) — only one service is generally billable per day, and G400 reflects the higher level of care.');
    assumptions.push('Confirm whether C101 (Cardiac CCU premium) stacks with G400 itself — the sources this app is built from confirm C101 pairs with admission/C122/C123/MRP visits/discharge, but don\'t explicitly list G400.');
  } else if (isPostIcuTransfer) {
    code = isDay2 ? 'C143' : 'C142';
    catKey = 'mrp';
    rationale.push(`Post-ICU/CCU transfer, MRP remaining in charge → ${code} — only billable if C122${isDay2 ? '/C123' : ''} hasn't already been billed this admission.`);
  } else if (isCcuAcute && isCcuPerDiem) {
    code = 'G521'; catKey = 'ccu';
    rationale.push('Life-threatening critical care described in a CCU/ICU context → G521 (first ¼h), plus G523/G522 for additional time.');
    assumptions.push('Assumed this is the first critical-care physician billing for this patient today — a 4th+ physician should bill G391 instead.');
  } else if (isCcuPerDiem && !isDischarge) {
    if (isDay1) {
      code = 'G400'; catKey = 'ccu';
      rationale.push('Day 1 in Cardiac CCU, MRP → G400 per-diem. Cannot bill admission + G400 same day — bill whichever is worth more.');
    } else {
      code = 'G401'; catKey = 'ccu';
      rationale.push('CCU per-diem, day 2 onward → G401 (use G402 after day 31).');
    }
    addOns.push({ code: 'C101', why: 'Cardiac CCU premium add-on' });
  } else if (isDischarge) {
    code = 'C124'; catKey = 'mrp';
    rationale.push('Discharge day described → C124, assuming admission spanned ≥48h and a discharge summary is completed within 48h.');
    addOns.push({ code: 'E083/E084', why: 'MRP discharge-day premium (E084 if weekend/holiday)' });
    assumptions.push('If the admission was under 48h, C124 isn\'t payable — bill C122 for that day instead (same fee).');
  } else if (isCallback && !isNewAdmission) {
    code = 'A604'; catKey = 'consults';
    if (isReassess) {
      rationale.push('Called back to reassess an existing patient (not routine rounding) → general re-assessment (A604), or A601 if it was a genuinely complex/lengthy reassessment. The A-prefix code reflects what was actually done, not the time of day — only the premium (below) changes with time of day.');
    } else {
      rationale.push('Callback to see an existing patient (not routine rounding) → defaulting to general re-assessment (A604) as a starting point. The actual A-code depends on what was done — A605 if this was really a fresh consult, A603 for a specific assessment, A601 if complex, A608 if brief/partial — check Browse if none of those fit. Either way, the A-prefix pattern applies (not a routine C-prefix code), and only the premium below changes with time of day.');
    }
    const block = SVP_TIME_BLOCKS.find((b) => b.id === timeBlock.id) || SVP_TIME_BLOCKS[0];
    const svpCode = isSecondPatient ? block.additional : block.first;
    addOns.push({
      code: svpCode,
      why: isSecondPatient
        ? `special visit premium for ${block.label} — additional person, since this was the 2nd+ patient seen this callback trip`
        : `special visit premium for ${block.label} — first person seen this callback; use ${block.additional} instead for any further patients seen the same trip`,
    });
    if (timeBlock.assumed) {
      assumptions.push('Couldn\'t confirm time of day from the description — assumed weekday daytime; adjust the premium if this was evening/night/weekend.');
    }
  } else if (isNewAdmission && !isDay2 && !isDay3) {
    const needsPremium = isViaEr || timeBlock.id !== 'day' || isCallback;
    if (isComprehensive) {
      code = 'A600/C600'; catKey = 'consults';
      rationale.push('New admission with ≥75 min of documented direct contact → comprehensive consultation.');
    } else if (needsPremium || isViaEr) {
      code = 'A605'; catKey = 'consults';
      rationale.push('Admission via ER, or on the ward with an after-hours/weekend premium → use the A-prefix service with the matching K-prefix premium.');
    } else {
      code = 'C605'; catKey = 'consults';
      rationale.push('Simple weekday ward admission, no premium → C605 (consult starts with C when no premium applies).');
    }
    addOns.push({ code: 'E082', why: 'admission premium, on the admission assessment itself' });
    if (needsPremium) {
      const block = SVP_TIME_BLOCKS.find((b) => b.id === timeBlock.id) || SVP_TIME_BLOCKS[0];
      addOns.push({ code: `${block.additional.replace('C', 'K')}`, why: `special visit premium for ${block.label} (K-prefix, admission context) — use the additional-person code where reasonable` });
      if (timeBlock.assumed) {
        assumptions.push('Couldn\'t confirm time of day from the description — assumed weekday daytime; adjust the premium if this was evening/night/weekend.');
      }
    }
    if (isCcuPerDiem) {
      addOns.push({ code: 'C101', why: 'if admitting directly into Cardiac CCU' });
    }
  } else if (isDay1) {
    code = 'C122'; catKey = 'mrp';
    rationale.push('Day 1 of routine inpatient rounds as MRP → C122.');
    addOns.push({ code: 'E083/E084', why: 'MRP premium on the subsequent visit (E084 if weekend/holiday)' });
  } else if (isDay2 || isDay3) {
    code = 'C123'; catKey = 'mrp';
    rationale.push('Routine inpatient rounds, day 2+ as MRP → C123 (requires a prior C122 on this admission).');
    addOns.push({ code: 'E083/E084', why: 'MRP premium on the subsequent visit (E084 if weekend/holiday)' });
  } else if (isOutpatientChf) {
    code = 'A604/C604'; catKey = 'consults';
    rationale.push('Outpatient/office re-assessment with established CHF diagnosis → base assessment + E088 CHF premium.');
    addOns.push({ code: 'E088', why: 'established CHF diagnosis, office/outpatient setting (+50%)' });
  } else if (isReassess) {
    code = 'A601/A604'; catKey = 'consults';
    rationale.push('Re-assessment described → A604 (general) or A601 (complex) depending on documented complexity.');
  } else if (isConsult) {
    if (isComprehensive) {
      code = 'A600/C600'; catKey = 'consults';
      rationale.push('Consultation with ≥75 min documented contact → comprehensive consultation.');
    } else {
      code = 'A605/C605'; catKey = 'consults';
      rationale.push('Consultation described → standard consultation.');
    }
  } else if (isCcuPerDiem || isCcuAcute) {
    code = 'G521'; catKey = 'ccu';
    rationale.push('CCU/critical-care context → G521 (first ¼h) as the base critical-care code.');
    assumptions.push('Couldn\'t confirm this meets the "life-threatening" bar from the description — if this is a routine CCU round rather than acute critical care, G400/G401 per-diem may fit better.');
  } else if (has(text, 'routine visit', 'routine follow-up', 'follow up', 'subsequent visit', 'seeing on the floor', 'rounding')) {
    code = 'C602'; catKey = 'mrp';
    rationale.push('Routine MRP subsequent visit described → C602 (up to 5 weeks; C607 weeks 6–13, C609 after).');
    addOns.push({ code: 'E083/E084', why: 'MRP visit premium (E084 if weekend/holiday)' });
  }

  if (isElectiveOrRounds && catKey === 'premiums') {
    assumptions.push('Special visit premiums aren\'t payable for rounds or elective admissions — confirm this was a genuine unscheduled callback.');
  }

  if (!code) {
    return { code: null, catKey: null, rationale: [], assumptions: ['Couldn\'t confidently match this description — try adding more detail (setting, day of admission, procedure, time of day).'], addOns: [] };
  }

  return { code, catKey, rationale, assumptions, addOns, timeBlock };
}

function normalizeCodeList(raw) {
  return (raw || '')
    .split(/[,\s/]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Applies the optional same-day cross-check against a recommended code.
 * Returns { finalCode, swapped: bool, swapNote: string|null }
 */
function crossCheckSameDay(recommendedCode, alreadyBilledRaw) {
  const alreadyBilled = normalizeCodeList(alreadyBilledRaw);
  if (!recommendedCode || alreadyBilled.length === 0) {
    return { finalCode: recommendedCode, swapped: false, swapNote: null };
  }

  const primary = recommendedCode.split(/[/+]/)[0].trim().toUpperCase();

  if (DAILY_LIMIT_CODES.includes(primary) && alreadyBilled.includes(primary)) {
    const admissionNote = PER_ADMISSION_CODES.includes(primary)
      ? ` Note: ${primary} is actually capped once per admission, not just once per day — confirm it wasn't billed earlier in this stay either.`
      : '';
    return {
      finalCode: DAILY_LIMIT_ALT,
      swapped: true,
      swapNote: `${primary} was already billed today for this patient — MOH won't pay it twice same-day, so ${DAILY_LIMIT_ALT} is recommended for this additional encounter instead.${admissionNote}`,
    };
  }

  for (const block of SVP_TIME_BLOCKS) {
    if (primary === block.first && alreadyBilled.includes(block.first)) {
      return {
        finalCode: block.additional,
        swapped: true,
        swapNote: `${block.first} (first person seen, ${block.label}) was already billed today — recommending ${block.additional} (additional person seen) instead. Billing the first-person code twice in one day gets rejected by MOH.`,
      };
    }
  }

  for (const [firstK, additionalK] of Object.entries(K_PREFIX_ADDITIONAL)) {
    if (primary === firstK && alreadyBilled.includes(firstK)) {
      return {
        finalCode: additionalK,
        swapped: true,
        swapNote: `${firstK} (first person seen) was already billed today for this admission — recommending ${additionalK} (additional person seen) instead.`,
      };
    }
  }

  return { finalCode: recommendedCode, swapped: false, swapNote: null };
}

/**
 * Combines parseSituation() output with the optional same-day check into a
 * render-ready result.
 */
function buildAskResult(situationText, alreadyBilledText) {
  const parsed = parseSituation(situationText);
  if (!parsed.code) {
    return parsed;
  }

  const { finalCode, swapped, swapNote } = crossCheckSameDay(parsed.code, alreadyBilledText);
  const info = codeInfo(finalCode) || codeInfo(parsed.code);

  return {
    ...parsed,
    code: finalCode,
    originalCode: swapped ? parsed.code : null,
    info,
    rationale: swapped ? [...parsed.rationale, swapNote] : parsed.rationale,
    swapped,
  };
}
