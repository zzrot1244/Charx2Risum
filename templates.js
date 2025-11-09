export function makeProfileEntry(profileText, activationKey) {
  return {
    key: activationKey || "",
    secondkey: "",
    insertorder: 100,
    comment: "소개문",
    content: profileText,
    mode: "normal",
    alwaysActive: false,
    selective: false,
    extentions: {
      risu_case_sensitive: false,
      risu_loreCache: null
    },
    loreCache: null,
    useRegex: false,
    bookVersion: 2
  };
}

export function makeGNDEntry(name, all_keywords, costumesWithKeywords, useCostume, activationKey) {
  let GNDtemplate;
  
  if (useCostume) {
    // 복장 시스템 사용 - 복장별 키워드 표시
    GNDtemplate = `## [MUST FOLLOW!] ${name} Persona Image Commands (Keyword-Only)

### Rules
- Analyze ${name}'s current state.
- Output 0–2 image tags per response, each on its own line between paragraphs.
- Use ONLY keywords from the library below for each costume.
- If a desired keyword is missing, pick the CLOSEST valid one for that costume.
- Format: \`<img src="${name}_{{costume}}_{{keyword}}">\`

### Costume and Available Keywords
${costumesWithKeywords}

### Examples
* \`<img src="${name}_outfit_example1">\`
* \`<img src="${name}_outfit_example2">\`
* WRONG: \`<img src="${name}.wrong">\` (use _)
* WRONG: \`<img src="${name}_very_happy_2">\` (not in library)
* WRONG: \`<img src="${name}_example1">\` (don't have outfit)
* WRONG: \`<img src="${name}_outfit_wrongkeyword">\` (keyword not available for this outfit)`;
  } else {
    // 복장 미사용
    GNDtemplate = `## [MUST FOLLOW!] ${name} Persona Image Commands (Keyword-Only)

### Rules
- Analyze ${name}'s current state.
- Output 0–2 image tags per response, each on its own line between paragraphs.
- Use ONLY keywords from the library below.
- If a desired keyword is missing, pick the CLOSEST valid one.
- Format: \`<img src="${name}_{{keyword}}">\`

### Keyword Library
${all_keywords}

### Examples
* \`<img src="${name}_example1">\`
* \`<img src="${name}_example2">\`
* WRONG: \`<img src="${name}.wrong">\` (use _)
* WRONG: \`<img src="${name}_very_happy_2">\` (not in library)`;
  }

  return {
    key: activationKey || "",
    secondkey: "",
    insertorder: 100,
    comment: "글노덮",
    content: GNDtemplate,
    mode: "normal",
    alwaysActive: false,
    selective: false,
    extentions: {
      risu_case_sensitive: false,
      risu_loreCache: null
    },
    loreCache: null,
    useRegex: false,
    bookVersion: 2
  };
}

export const reTemplate = {
  "comment": "",
  "in": "",
  "out": "",
  "type": "",
  "ableFlag": false
};

export const trigger1 = {
  comment: "",
  type: "manual",
  conditions: [],
  effect: [
    {
      type: "v2Header",
      code: "",
      indent: 0
    }
  ],
  lowLevelAccess: false
};

export const trigger2 = {
  comment: "New Event",
  type: "manual",
  conditions: [],
  effect: [],
  lowLevelAccess: false
};