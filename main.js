import { encodeRPack } from './rpack_bg.js'; // existing local module
import { makeProfileEntry, makeGNDEntry, trigger1, trigger2, reTemplate } from './templates.js';

class BinaryWriter {
  parts = []; totalLength = 0;
  writeByte(v) { const a = new Uint8Array([v]); this.parts.push(a); this.totalLength += 1; }
  writeUInt32LE(v) { const b = new ArrayBuffer(4); new DataView(b).setUint32(0, v, true); this.parts.push(new Uint8Array(b)); this.totalLength += 4; }
  writeBytes(d) { this.parts.push(d); this.totalLength += d.length; }
  toUint8Array() { const r = new Uint8Array(this.totalLength); let o = 0; for (const p of this.parts) { r.set(p, o); o += p.length; } return r; }
}

const MAGIC_NUMBER = 111, VERSION = 0, ASSET_MARKER = 1, EOF_MARKER = 0;
const textEncoder = new TextEncoder();

const fileInput = document.getElementById('fileInput');
const filterInput = document.getElementById('filterText');
const statusDiv = document.getElementById('status');
const createRisumButton = document.getElementById('createRisumButton');
const hasNameToggle = document.getElementById('hasNameToggle');
const useCostumeToggle = document.getElementById('useCostumeToggle');
const charNameInput = document.getElementById('charName');
const profileInput = document.getElementById('profileInput');
const activationKeyInput = document.getElementById('activationKeyInput');
const viewImagesButton = document.getElementById('viewImagesButton');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imageControls = document.getElementById('imageControls');
const tagInput = document.getElementById('tagInput');
const tagIndexInput = document.getElementById('tagIndexInput');
const addTagButton = document.getElementById('addTagButton');
const hideTagInputToggle = document.getElementById('hideTagInputToggle');
const selectAllToggle = document.getElementById('selectAllToggle');

// 초기 상태에서 필터 입력창 숨기기
filterInput.style.display = hasNameToggle.checked ? 'none' : 'inline-block';
hasNameToggle.addEventListener('change', () => {
  filterInput.style.display = hasNameToggle.checked ? 'none' : 'inline-block';
});

// 전체 선택 토글
selectAllToggle.addEventListener('change', () => {
  const checkboxes = imagePreviewContainer.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = selectAllToggle.checked;
  });
});

hideTagInputToggle.addEventListener('change', () => {
  if (hideTagInputToggle.checked) {
    imageControls.style.display = 'none';
  } else {
    // 이미지 보이기가 켜져있을 때만 컨트롤 표시
    if (viewImagesButton.checked) {
      imageControls.style.display = 'flex';
    }
  }
});

viewImagesButton.addEventListener('change', () => {
  if (viewImagesButton.checked) {
    // 토글이 켜졌을 때 이미지 로드 및 컨트롤 표시
    imagePreviewContainer.innerHTML = ''; // Clear previous previews
    if (processedAssetsMap.size === 0) {
      alert("표시할 이미지가 없습니다.");
      viewImagesButton.checked = false;
      return;
    }

    imageControls.style.display = 'flex'; // 컨트롤 표시
    // 단, "텍스트 추가 안하기"가 체크되어 있으면 숨김
    if (hideTagInputToggle.checked) {
      imageControls.style.display = 'none';
    }

    for (const [name, blob] of processedAssetsMap.entries()) {
      const url = URL.createObjectURL(blob);
      const item = document.createElement('div');
      item.className = 'preview-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.imageName = name;

      const img = document.createElement('img');
      img.src = url;
      img.alt = name;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'preview-item-info';

      const originalNameP = document.createElement('p');
      originalNameP.className = 'original-name';
      const originalNameWithoutExt = name.substring(0, name.lastIndexOf('.')) || name;
      originalNameP.textContent = `원본: ${originalNameWithoutExt}`;

      // 최종 이름 계산 (캐릭터 이름 적용)
      const charName = charNameInput.value.trim() || originalCardName;
      const extension = name.split('.').pop() || "png";
      const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
      const replaceName = nameWithoutExt.replace('.', '_');
      const splitNameParts = replaceName.split('_');
      
      let finalAssetName = charName;
      if (hasNameToggle.checked) {
        // 이름 존재 안함 - 모든 부분 사용
        finalAssetName += '_' + splitNameParts.join('_');
      } else {
        // 이름 존재함 - 첫 부분 제외
        finalAssetName += '_' + splitNameParts.slice(1).join('_');
      }

      const finalNameP = document.createElement('p');
      finalNameP.className = 'final-name';
      finalNameP.contentEditable = 'true'; // 편집 가능하게
      finalNameP.textContent = finalAssetName; // 확장자 제거된 이름만 표시
      finalNameP.dataset.originalMapKey = name; // Map의 원본 키 저장
      finalNameP.dataset.extension = extension; // 확장자 저장

      // 편집 완료 시 processedAssetsMap 업데이트
      finalNameP.addEventListener('blur', (e) => {
        const newNameWithoutExt = e.target.textContent.trim();
        if (!newNameWithoutExt) {
          alert("이름을 비울 수 없습니다.");
          e.target.textContent = finalAssetName;
          return;
        }
        const oldMapKey = finalNameP.dataset.originalMapKey;
        const newMapKey = `${newNameWithoutExt}.${extension}`;
        
        // Map 업데이트
        const blob = processedAssetsMap.get(oldMapKey);
        if (blob) {
          processedAssetsMap.delete(oldMapKey);
          processedAssetsMap.set(newMapKey, blob);
          finalNameP.dataset.originalMapKey = newMapKey; // 새 키로 업데이트
        }
        
        checkbox.dataset.imageName = newMapKey;
      });

      // Enter 키로도 편집 종료
      finalNameP.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.target.blur();
        }
      });

      infoDiv.appendChild(originalNameP);
      infoDiv.appendChild(finalNameP);

      item.appendChild(checkbox);
      item.appendChild(img);
      item.appendChild(infoDiv);
      imagePreviewContainer.appendChild(item);
    }
  } else {
    // 토글이 꺼졌을 때 이미지 제거 및 컨트롤 숨김
    imagePreviewContainer.innerHTML = '';
    imageControls.style.display = 'none';
  }
});

addTagButton.addEventListener('click', () => {
  const tagText = tagInput.value.trim();
  if (!tagText) {
    alert("추가할 텍스트를 입력하세요.");
    return;
  }

  const tagIndex = parseInt(tagIndexInput.value);
  if (isNaN(tagIndex) || tagIndex < 0) {
    alert("유효한 위치를 입력하세요 (0 이상).");
    return;
  }

  const checkboxes = imagePreviewContainer.querySelectorAll('input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    alert("하나 이상의 이미지를 선택하세요.");
    return;
  }

  let hasError = false;
  const errors = [];

  checkboxes.forEach(checkbox => {
    const item = checkbox.closest('.preview-item');
    const finalNameP = item.querySelector('.final-name');
    const oldMapKey = finalNameP.dataset.originalMapKey;
    const extension = finalNameP.dataset.extension;
    
    // 현재 표시된 이름 (확장자 제외)
    const currentNameWithoutExt = finalNameP.textContent.trim();
    
    // _로 분리
    const parts = currentNameWithoutExt.split('_');
    
    // 인덱스 범위 체크
    if (tagIndex > parts.length) {
      hasError = true;
      errors.push(`"${currentNameWithoutExt}": 인덱스 ${tagIndex}는 범위를 초과합니다 (최대: ${parts.length})`);
      return;
    }
    
    // 지정된 인덱스에 태그 삽입
    parts.splice(tagIndex, 0, tagText);
    
    const newNameWithoutExt = parts.join('_');
    const newMapKey = `${newNameWithoutExt}.${extension}`;
    
    // 최종 이름만 업데이트
    finalNameP.textContent = newNameWithoutExt;
    
    // Map에 저장된 이름도 업데이트
    const blob = processedAssetsMap.get(oldMapKey);
    if (blob) {
      processedAssetsMap.delete(oldMapKey);
      processedAssetsMap.set(newMapKey, blob);
      finalNameP.dataset.originalMapKey = newMapKey; // 키 업데이트
    }
    
    checkbox.dataset.imageName = newMapKey;
  });

  if (hasError) {
    alert("일부 이미지에서 오류가 발생했습니다:\n\n" + errors.join('\n'));
  }

  // 입력창 초기화 및 체크박스 해제
  tagInput.value = '';
  checkboxes.forEach(cb => cb.checked = false);
  selectAllToggle.checked = false;
});

let processedAssetsMap = new Map();
let originalCardName = "new_module";

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  statusDiv.textContent = `📂 '${file.name}' 처리 중...`;
  createRisumButton.classList.remove('visible');
  processedAssetsMap.clear();

  try {
    const buffer = await file.arrayBuffer();
    const filterText = filterInput.value.trim();
    const { assetNameMap, cardName } = await makeAssetNameMap(buffer, filterText);
    originalCardName = cardName || "new_module";

    const zip = await JSZip.loadAsync(buffer);
    processedAssetsMap = await loadAssetsIntoMemory(zip, assetNameMap);

    statusDiv.textContent = `✅ ${processedAssetsMap.size}개 에셋 로드 완료. .risum 생성 가능`;
    if (processedAssetsMap.size > 0) {
      createRisumButton.classList.add('visible');
    } else {
      createRisumButton.classList.remove('visible');
      statusDiv.textContent = "⚠️ 일치하는 에셋이 없습니다.";
    }
  } catch (err) { console.error(err); statusDiv.textContent = "❌ 오류: " + err.message; }
});

createRisumButton.addEventListener('click', async () => {
  if (processedAssetsMap.size === 0) { alert("변환할 에셋이 없습니다."); return; }
  statusDiv.textContent = `🖊️ ${processedAssetsMap.size}개 에셋으로 .risum 생성 중...`;
  const charName = charNameInput.value.trim() || originalCardName;
  const profileText = profileInput.value;
  const activationKey = activationKeyInput.value.trim();

  try {
    const assetsForExport = [], assetsForJson = [];
    const keywordSet = new Set();
    const costumeSet = new Set();
    const costumeKeywordMap = new Map(); // 복장별 키워드 매핑
    
    for (const [fullName, blob] of processedAssetsMap.entries()) {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Data = new Uint8Array(arrayBuffer);
      assetsForExport.push({ id: fullName, data: uint8Data });

      const extension = fullName.split('.').pop() || "png";
      const nameWithoutExt = fullName.substring(0, fullName.lastIndexOf('.'));
      
      // processedAssetsMap의 키는 이미 최종 변환된 이름이므로 그대로 사용
      const assetName = nameWithoutExt;
      
      // 키워드 추출: 캐릭터 이름 이후의 모든 부분
      const splitAssetName = assetName.split('_');
      
      if (useCostumeToggle.checked && splitAssetName.length > 2) {
        // 복장 시스템 사용: 이름_복장_키워드
        const costume = splitAssetName[1];
        const keywords = splitAssetName.slice(2);
        
        costumeSet.add(costume);
        
        // 복장별 키워드 매핑
        if (!costumeKeywordMap.has(costume)) {
          costumeKeywordMap.set(costume, new Set());
        }
        keywords.forEach(k => {
          if (k) {
            keywordSet.add(k);
            costumeKeywordMap.get(costume).add(k);
          }
        });
        
        console.log(`에셋: ${fullName} -> 복장: ${costume}, 키워드:`, keywords);
      } else {
        // 복장 미사용: 이름_키워드
        splitAssetName.slice(1).forEach(k => { if (k) keywordSet.add(k); });
        console.log(`에셋: ${fullName} -> 키워드:`, splitAssetName.slice(1));
      }

      assetsForJson.push([assetName, "", extension]);
    }

    const newModuleId = crypto.randomUUID();
    console.log('추출된 복장:', Array.from(costumeSet));
    console.log('추출된 키워드:', Array.from(keywordSet));
    console.log('복장별 키워드:', Object.fromEntries(
      Array.from(costumeKeywordMap.entries()).map(([k, v]) => [k, Array.from(v)])
    ));
    const moduleData = createModuleData(newModuleId, charName, keywordSet, costumeSet, costumeKeywordMap, profileText, activationKey, useCostumeToggle.checked);
    console.log('최종 GND:', moduleData.lorebook[1].content);
    moduleData.assets = assetsForJson;

    const fileBytes = await exportRisum(moduleData, assetsForExport);
    triggerDownload(fileBytes, `${charName}.risum`);
    statusDiv.textContent = `✅ ${charName}.risum 생성 완료!`;
  } catch (err) { console.error(err); statusDiv.textContent = "❌ .risum 생성 오류: " + err.message; }
});

async function makeAssetNameMap(buffer, filterText = "") {
  let zip;
  try { zip = await JSZip.loadAsync(buffer); } catch { throw new Error("ZIP 파일 열기 실패"); }
  const cardJsonFile = zip.file('card.json');
  if (!cardJsonFile) throw new Error("'card.json' 없음");
  const assetNameMap = new Map();
  const metadata = JSON.parse(await cardJsonFile.async('string'));
  const assetsList = metadata?.data?.assets || [];
  const cardName = metadata?.data?.name || "new_module";
  for (const asset of assetsList) {
    const uri = asset.uri?.split('/').pop();
    const name = asset.name || "";
    if (!uri) continue;
    if (!filterText || name.includes(filterText)) assetNameMap.set(uri, name);
  }
  return { assetNameMap, cardName };
}

async function loadAssetsIntoMemory(zip, assetMap) {
  const assetDataMap = new Map();
  for (const [path, file] of Object.entries(zip.files)) {
    const fileName = path.split('/').pop();
    if (assetMap.has(fileName)) {
      const blob = await file.async("blob");
      const assetName = assetMap.get(fileName);
      assetDataMap.set(assetName, blob);
    }
  }
  return assetDataMap;
}

function createModuleData(id, name, keywords, costumes, costumeKeywordMap, profileText, activationKey, useCostume) {
  const safeKeywords = keywords || [];
  const keywordArray = [...new Set(Array.from(safeKeywords))]
      .filter(k => k && typeof k === 'string' && k.trim() !== '')
      .map(k => k.trim())
      .sort();

  const safeCostumes = costumes || [];
  const costumeArray = [...new Set(Array.from(safeCostumes))]
      .filter(c => c && typeof c === 'string' && c.trim() !== '')
      .map(c => c.trim())
      .sort();

  const all_keywords = keywordArray.join(', ');
  const all_costumes = costumeArray.join(', ');
  
  // 복장별 키워드 맵 생성
  let costumesWithKeywords = '';
  if (useCostume && costumeKeywordMap) {
    costumesWithKeywords = costumeArray.map(costume => {
      const keywords = costumeKeywordMap.get(costume);
      const keywordList = keywords ? Array.from(keywords).sort().join(', ') : '';
      return `**${costume}**: ${keywordList}`;
    }).join('\n');
  }

  const displayRule = { ...reTemplate };
  displayRule.comment = "최종 디스플레이"
  displayRule.in = "<img src=\"(.+)\">"
  displayRule.out = "<style>\n    .image-container {\n        margin: auto auto;\n        background-size: cover;\n        background-position: center center;\n        border-radius: 20px;\n        border: 5px solid #EBE0E0;\n        cursor: pointer;\n        transition: all 0.6s ease;\n        {{#if {{? {{screen_width}} > 768 }} }}\n          width: 20em;\n        {{/if}}\n        {{#if {{? {{screen_width}} <= 768 }} }}\n          width: 95%;\n        {{/if}}\n        {{#if {{? {{screen_width}} > 768 }} }}\n          aspect-ratio: 2 / 3;\n        {{/if}}\n        {{#if {{? {{screen_width}} <= 768 }} }}\n          aspect-ratio: 1 / 1.5;\n        {{/if}}\n    }\n</style>\n<div class=\"image-container\" style=\"background-image: url('{{raw::$1}}')\"></div>"
  displayRule.type = "editdisplay"

  const imageRule = { ...reTemplate };
  let patternInside, imgTag;
  
  if (useCostume) {
    // 복장 시스템 사용: 이름_복장_키워드
    patternInside = `${name}_(?:${costumeArray.join('|')})_(?:${keywordArray.join('|')})`;
    imgTag = `<img src=\"(${patternInside})\">`;
  } else {
    // 복장 미사용: 이름_키워드
    patternInside = `${name}_(?:${keywordArray.join('|')})`;
    imgTag = `<img src=\"(${patternInside})\">`;
  }
  
  imageRule.comment = "통합 규칙"
  imageRule.in = imgTag
  imageRule.out = "<img src=\"$1\">"; 
  imageRule.type = "editoutput"

  // 프로필과 GND 항목을 templates 모듈로 생성
  const profileEntry = makeProfileEntry(profileText, activationKey);
  const GNDEntry = makeGNDEntry(name, all_keywords, costumesWithKeywords, useCostume, activationKey);

  // 트리거는 templates에서 가져온 상수 사용
  // (이미 import 한 trigger1, trigger2 사용)
  return {
    name,
    description: name,
    id,
    assets: [],
    namespace: "",
    hideIcon: false,
    customModuleToggle: "",
    regex: [imageRule, displayRule],
    lorebook: [profileEntry, GNDEntry],
    trigger: [trigger1, trigger2],
    lowLevelAccess: false,
    backgroundEmbedding: ""
  };
}

async function exportRisum(moduleData, assets) {
  const writer = new BinaryWriter();
  const mainDataWrapper = { module: moduleData, type: "risuModule" };
  const mainDataJson = textEncoder.encode(JSON.stringify(mainDataWrapper));
  const compressedMainData = await encodeRPack(mainDataJson);

  writer.writeByte(MAGIC_NUMBER);
  writer.writeByte(VERSION);
  writer.writeUInt32LE(compressedMainData.length);
  writer.writeBytes(compressedMainData);

  for (const asset of assets) {
    const compressedAssetData = await encodeRPack(asset.data);
    writer.writeByte(ASSET_MARKER);
    writer.writeUInt32LE(compressedAssetData.length);
    writer.writeBytes(compressedAssetData);
  }

  writer.writeByte(EOF_MARKER);
  return writer.toUint8Array();
}

function triggerDownload(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; 
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}