export function makeProfileEntry(profileText) {
  return {
    key: "",
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

export function makeGNDEntry(name, all_keywords, all_costumes, useCostume) {
  let GNDtemplate;
  
  if (useCostume) {
    // 복장 시스템 사용
    GNDtemplate = `## [MUST FOLLOW!] ${name} Persona Image Commands (Keyword-Only)

### Rules
- Analyze ${name}'s current state.
- Output 1–3 image tags per response, each on its own line between paragraphs.
- Use ONLY keywords from the library below.
- If a desired keyword is missing, pick the CLOSEST valid one.
- Format: \`<img cmd="${name}_{{costume}}_{{keyword}}">\`

### Costume Library
${all_costumes}

### Keyword Library
${all_keywords}

### Examples
* \`<img cmd="${name}_outfit_example1">\`
* \`<img cmd="${name}_outfit_example2">\`
* WRONG: \`<img cmd="${name}.wrong">\` (use _)
* WRONG: \`<img cmd="${name}_very_happy_2">\` (not in library)
* WRONG: \`<img cmd="${name}_example1">\` (don't have outfit)`;
  } else {
    // 복장 미사용
    GNDtemplate = `## [MUST FOLLOW!] ${name} Persona Image Commands (Keyword-Only)

### Rules
- Analyze ${name}'s current state.
- Output 2–4 image tags per response, each on its own line between paragraphs.
- Use ONLY keywords from the library below.
- If a desired keyword is missing, pick the CLOSEST valid one.
- Format: \`<img cmd="${name}_{{keyword}}">\`

### Keyword Library
${all_keywords}

### Examples
* \`<img cmd="${name}_example1">\`
* \`<img cmd="${name}_example2">\`
* WRONG: \`<img cmd="${name}.wrong">\` (use _)
* WRONG: \`<img cmd="${name}_very_happy_2">\` (not in library)`;
  }

  return {
    key: "",
    secondkey: "",
    insertorder: 100,
    comment: "글노덮",
    content: GNDtemplate,
    mode: "normal",
    alwaysActive: true,
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