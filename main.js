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
  // If previews are currently shown, re-render them so the name-in-front logic updates immediately
  if (viewImagesButton.checked) {
    renderImagePreviews();
  }
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
    renderImagePreviews();
  } else {
    // 토글이 꺼졌을 때 이미지 제거 및 컨트롤 숨김
    imagePreviewContainer.innerHTML = '';
    imageControls.style.display = 'none';
  }
});

// render previews (extracted so toggles can re-render)
function renderImagePreviews() {
  imagePreviewContainer.innerHTML = ''; // 이전 미리보기 초기화
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

    // 1. 원본 이름 표시 (참고용)
    const originalNameP = document.createElement('p');
    originalNameP.className = 'original-name';
    const originalNameWithoutExt = name.substring(0, name.lastIndexOf('.')) || name;
    originalNameP.textContent = `원본: ${originalNameWithoutExt}`;

    // 2. 최종 이름 계산 로직 (캐릭터 이름 및 토글 옵션 적용)
    const charName = charNameInput.value.trim() || originalCardName;
    const extension = name.split('.').pop() || "png";
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    
    // 점(.)을 밑줄(_)로 모두 치환 (파일명 꼬임 방지)
    const replaceName = nameWithoutExt.replaceAll('.', '_'); 
    const splitNameParts = replaceName.split('_');
    
    let finalAssetName = charName;
    if (hasNameToggle.checked) {
      // "이름 존재 안함" 체크 시: 원본의 모든 부분을 붙임
      finalAssetName += '_' + splitNameParts.join('_');
    } else {
      // "이름 존재함" (기본) 시: 원본의 첫 부분(기존 캐릭터명 등)을 제외하고 붙임
      finalAssetName += '_' + splitNameParts.slice(1).join('_');
    }

    // 3. 최종 이름 표시 요소 (수정 가능)
    const finalNameP = document.createElement('p');
    finalNameP.className = 'final-name';
    finalNameP.contentEditable = 'true'; // ★ 편집 가능하게 설정
    finalNameP.textContent = finalAssetName; // 확장자는 떼고 보여줌
    
    // ★ 중요: 나중에 파일을 만들 때 필요한 원본 정보를 숨겨둠
    finalNameP.dataset.originalMapKey = name; 
    finalNameP.dataset.extension = extension; 

    // 4. 이름 수정 후 포커스 잃었을 때(Blur) 내부 Map 업데이트
    finalNameP.addEventListener('blur', (e) => {
      const newNameWithoutExt = e.target.textContent.trim();
      if (!newNameWithoutExt) {
        alert("이름을 비울 수 없습니다.");
        e.target.textContent = finalAssetName; // 원래대로 복구
        return;
      }
      
      const oldMapKey = finalNameP.dataset.originalMapKey;
      const newMapKey = `${newNameWithoutExt}.${extension}`;
      
      // Map 업데이트: 기존 키 삭제 후 새 키로 등록
      const blobData = processedAssetsMap.get(oldMapKey);
      if (blobData) {
        processedAssetsMap.delete(oldMapKey);
        processedAssetsMap.set(newMapKey, blobData);
        
        // 데이터 속성도 새 키로 업데이트 (다시 수정할 때를 대비)
        finalNameP.dataset.originalMapKey = newMapKey; 
        
        // 체크박스 등 다른 곳에서 참조하는 키도 업데이트
        checkbox.dataset.imageName = newMapKey;
      }
    });

    // 엔터 키 누르면 수정 종료 (줄바꿈 방지)
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
}


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
  // 1. 기본 입력값 확인
  const charName = charNameInput.value.trim() || originalCardName;
  if (!charName) {
    alert("캐릭터 이름을 입력해주세요.");
    return;
  }
  const profileText = profileInput.value;
  const activationKey = activationKeyInput.value.trim();

  statusDiv.textContent = "데이터 준비 중...";

  // 2. [수정됨] 처리할 에셋 목록 구성 (화면 이름 vs 원본 데이터)
  const targetAssets = [];

  // (A) 미리보기가 켜져 있고 내용이 있다면 화면의 'final-name'을 사용
  if (viewImagesButton.checked && imagePreviewContainer.children.length > 0) {
    const items = imagePreviewContainer.querySelectorAll('.preview-item');
    items.forEach(item => {
      const nameEl = item.querySelector('.final-name');
      if (nameEl) {
        const finalName = nameEl.textContent.trim();       // 화면에 보이는 최종 이름
        const ext = nameEl.dataset.extension;              // 확장자
        const mapKey = nameEl.dataset.originalMapKey;      // 원본 Blob 키

        const blob = processedAssetsMap.get(mapKey);
        if (blob) {
          targetAssets.push({ fullName: `${finalName}.${ext}`, blob: blob });
        }
      }
    });
  } 
  // (B) 미리보기가 꺼져 있다면 기존 Map 데이터 사용
  else {
    for (const [key, blob] of processedAssetsMap.entries()) {
      targetAssets.push({ fullName: key, blob: blob });
    }
  }

  if (targetAssets.length === 0) {
    alert("변환할 에셋이 없습니다.");
    statusDiv.textContent = "";
    return;
  }

  try {
    const assetsForExport = [];
    const assetsForJson = [];
    const keywordSet = new Set();
    const costumeSet = new Set();
    const costumeKeywordMap = new Map(); // 복장별 키워드 매핑

    // 3. 구성된 targetAssets를 순회하며 데이터 추출 및 분석
    for (const { fullName, blob } of targetAssets) {
      // 바이너리 데이터 준비
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Data = new Uint8Array(arrayBuffer);
      assetsForExport.push({ id: fullName, data: uint8Data });

      // 메타데이터 분석 (이름 기반 키워드/복장 추출)
      const extension = fullName.split('.').pop() || "png";
      const nameWithoutExt = fullName.substring(0, fullName.lastIndexOf('.'));
      
      const splitAssetName = nameWithoutExt.split('_');
      
      if (useCostumeToggle.checked && splitAssetName.length > 2) {
        // [수정됨] 복장 시스템 사용: 이름_복장_나머지전부
        const costume = splitAssetName[1];
        
        // slice(2)로 잘라낸 배열을 '_'로 다시 합쳐서 하나의 키워드로 만듭니다.
        const singleKeyword = splitAssetName.slice(2).join('_');
        
        costumeSet.add(costume);
        
        if (!costumeKeywordMap.has(costume)) {
          costumeKeywordMap.set(costume, new Set());
        }
        
        if (singleKeyword) {
          keywordSet.add(singleKeyword);
          costumeKeywordMap.get(costume).add(singleKeyword);
        }
        
      } else {
        // [수정됨] 복장 미사용: 이름_나머지전부
        // slice(1)로 잘라낸 배열을 '_'로 다시 합쳐서 하나의 키워드로 만듭니다.
        const singleKeyword = splitAssetName.slice(1).join('_');
        
        if (singleKeyword) {
          keywordSet.add(singleKeyword);
        }
      }

      // assets.json에 들어갈 항목
      assetsForJson.push([nameWithoutExt, "", extension]);
    }

    // 4. 모듈 데이터 생성 (createModuleData 호출)
    const newModuleId = crypto.randomUUID();
    
    // 기존에 정의된 createModuleData 함수 사용
    const moduleData = createModuleData(
      newModuleId, 
      charName, 
      keywordSet, 
      costumeSet, 
      costumeKeywordMap, 
      profileText, 
      activationKey, 
      useCostumeToggle.checked
    );
    
    moduleData.assets = assetsForJson;

    // 5. .risum 파일 패킹 및 다운로드
    const risumBytes = await exportRisum(moduleData, assetsForExport);
    triggerDownload(risumBytes, `${charName}.risum`);
    statusDiv.textContent = "완료! 다운로드되었습니다.";

  } catch (e) {
    console.error(e);
    statusDiv.textContent = "오류 발생: " + e.message;
  }
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