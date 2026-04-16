// 4대보험 자격취득 신고 관련 타입 정의

/**
 * 사업장 정보
 */
export interface WorkplaceInfo {
  managementNumber: string; // 사업장관리번호
  name: string; // 명칭
  unitName?: string; // 단위사업장 명칭
  branchName?: string; // 영업소 명칭
  postalCode: string; // 소재지 우편번호
  address: string; // 주소
  addressDetail?: string; // 상세주소
  phoneNumber: string; // 전화번호
  faxNumber?: string; // FAX번호
  email?: string; // 전자우편주소
  mobilePhone?: string; // 휴대폰번호
}

/**
 * 보험사무 대행기관 정보
 */
export interface AgencyInfo {
  number?: string; // 번호
  name?: string; // 명칭
  subcontractorNumber?: string; // 하수인 관리번호
}

/**
 * 피부양자 정보
 */
export interface Dependent {
  relationship: string; // 피부양자 관계
  name: string; // 성명
  residentNumber: string; // 주민등록번호/외국인등록번호/국내거소신고번호
  isDisabledOrVeteran: boolean; // 장애인·국가유공자 여부
  disabilityTypeCode?: string; // 종별부호
  registrationDate?: string; // 등록일 (YYYY-MM-DD)
  isForeigner: boolean; // 외국인 여부
  nationality?: string; // 국적
  residenceStatus?: string; // 체류자격
  residencePeriod?: string; // 체류기간
}

/**
 * 직장가입자 (직원) 보험 정보
 */
export interface EmployeeInsuranceInfo {
  // 기본 정보
  employeeId?: string; // 직원 ID (기존 직원 선택 시)
  employeeNumber?: string; // 사번 (기존 직원 선택 시)
  name: string; // 성명
  residentNumber: string; // 주민등록번호/외국인등록번호
  nationality: string; // 국적
  nationalityType?: 'domestic' | 'foreign'; // 내외국인 구분
  residenceStatus?: string; // 체류자격
  monthlySalary: number; // 월 소득액
  acquisitionDate: string; // 자격취득일 (YYYY-MM-DD)

  // 보험 신청 여부
  applyPension: boolean; // 국민연금 신청 여부
  applyHealthInsurance: boolean; // 건강보험 신청 여부

  // 국민연금
  pensionAcquisitionCode: string; // 자격취득부호
  specialOccupationCode?: string; // 특수직종부호
  occupationalPensionCode?: string; // 직역연금부호
  wantToPayAcquisitionMonth: boolean; // 취득 월 납부 희망

  // 건강보험
  healthAcquisitionCode: string; // 자격취득부호
  premiumReductionCode: string; // 보험료/감면부호
  isPublicOfficial: boolean; // 공무원·교직원 여부
  accountName?: string; // 회계명
  accountCode?: string; // 회계부호
  jobName?: string; // 직종명
  jobCode?: string; // 직종부호
  applyForDependent: boolean; // 피부양자 신청
  dependents?: Dependent[]; // 피부양자 목록

  // 고용보험·산재보험
  employmentJobCode: string; // 직종부호
  weeklyWorkHours: number; // 1주 소정근로시간
  contractEndDate?: string; // 계약종료연월 (YYYY-MM)
  premiumImpositionType?: string; // 보험료부과구분
  reasonCode?: string; // 부호/사유
  applyEmploymentInsurance: boolean; // 고용보험 선택
  isContractWorker: boolean; // 계약직 여부
  applyWorkersCompensation: boolean; // 산재보험 선택

  // 대표자
  isCEO: boolean; // 대표자 여부
}

/**
 * 자격취득 신고서 전체 데이터
 */
export interface InsuranceAcquisitionForm {
  // 사업장 정보
  workplace: WorkplaceInfo;

  // 보험사무 대행기관 (선택)
  agency?: AgencyInfo;

  // 직장가입자 목록
  employees: EmployeeInsuranceInfo[];

  // 신고 정보
  reportDate: string; // 보고 연월일 (YYYY-MM-DD)
  reporterSignature?: string; // 신고인 서명/인
  agencySignature?: string; // 보험사무대행기관 서명/인

  // 임시 저장 메타데이터
  savedAt?: string; // 저장 시각
}

/**
 * 국민연금 자격취득부호
 */
export const PENSION_ACQUISITION_CODES = [
  { value: '01', label: '01 - 18세 이상 당연취득' },
  { value: '03', label: '03 - 18세 미만 신청 취득' },
  { value: '09', label: '09 - 전입' },
  { value: '11', label: '11 - 대학강사' },
  { value: '12', label: '12 - 60시간 미만 신청 취득' },
  { value: '14', label: '14 - 일용근로자, 단시간근로자 등' },
  { value: '15', label: '15 - 상실취소' },
] as const;

/**
 * 건강보험 자격취득부호
 */
export const HEALTH_ACQUISITION_CODES = [
  { value: '00', label: '00 - 최초취득' },
  { value: '04', label: '04 - 의료급여 수급권자등에서 제외' },
  { value: '05', label: '05 - 직장가입자 변경' },
  { value: '06', label: '06 - 직장피부양자 상실' },
  { value: '07', label: '07 - 지역가입자에서 변경' },
  { value: '10', label: '10 - 유공자 등 건강보험 적용 신청' },
  { value: '13', label: '13 - 기타' },
  { value: '14', label: '14 - 거주불명 등록 후 재등록' },
  { value: '29', label: '29 - 직장가입자 이중가입' },
  { value: '30', label: '30 - 상실취소(착오나 사정변경으로 자격상실 신고를 취소하는 경우)' },
] as const;

/**
 * 건강보험 보험료감면부호
 */
export const PREMIUM_REDUCTION_CODES = [
  { value: '00', label: '00 - 해당없음' },
  { value: '11', label: '11 - 해외근무(전액)' },
  { value: '12', label: '12 - 해외근무(반액)' },
  { value: '21', label: '21 - 현역 군 입대' },
  { value: '22', label: '22 - 상근예비역(현역 입대)' },
  { value: '24', label: '24 - 상근예비역(근무)' },
  { value: '31', label: '31 - 시설수용(교도소)' },
  { value: '32', label: '32 - 시설수용(기타)' },
  { value: '41', label: '41 - 섬ㆍ벽지(사업장)' },
  { value: '42', label: '42 - 섬ㆍ벽지(거주지)' },
  { value: '81', label: '81 - 휴직' },
] as const;

/**
 * 고용보험 직종부호 (카테고리별 그룹)
 */
export const EMPLOYMENT_JOB_CODES = [
  {
    category: '01. 관리직(임원ㆍ부서장)',
    codes: [
      { value: '011', label: '011 의회의원ㆍ고위공무원 및 기업 고위임원' },
      { value: '012', label: '012 행정ㆍ경영ㆍ금융ㆍ보험 관리자' },
      { value: '013', label: '013 전문서비스 관리자' },
      { value: '014', label: '014 미용ㆍ여행ㆍ숙박ㆍ음식ㆍ경비ㆍ청소 관리자' },
      { value: '015', label: '015 영업ㆍ판매ㆍ운송 관리자' },
      { value: '016', label: '016 건설ㆍ채굴ㆍ제조ㆍ생산 관리자' },
    ],
  },
  {
    category: '02. 경영ㆍ행정ㆍ사무직',
    codes: [
      { value: '021', label: '021 정부행정 전문가 및 관련 종사자' },
      { value: '022', label: '022 경영·인사 전문가' },
      { value: '023', label: '023 회계·세무·감정 전문가' },
      { value: '024', label: '024 광고·조사·상품기획·행사기획 전문가' },
      { value: '025', label: '025 정부행정 사무원' },
      { value: '026', label: '026 경영지원 사무원' },
      { value: '027', label: '027 회계·경리 사무원' },
      { value: '028', label: '028 무역·운송·생산·품질 사무원' },
      { value: '029', label: '029 안내·고객상담·통계·비서 및 기타 사무원' },
    ],
  },
  {
    category: '03. 금융ㆍ보험직',
    codes: [
      { value: '031', label: '031 금융ㆍ보험 전문가' },
      { value: '032', label: '032 금융ㆍ보험 사무원' },
      { value: '033', label: '033 금융ㆍ보험 영업원' },
    ],
  },
  {
    category: '11. 인문ㆍ사회과학 연구직',
    codes: [{ value: '110', label: '110 인문ㆍ사회과학 연구원' }],
  },
  {
    category: '12. 자연ㆍ생명과학 연구직',
    codes: [
      { value: '121', label: '121 자연과학 연구원 및 시험원' },
      { value: '122', label: '122 생명과학 연구원 및 시험원' },
    ],
  },
  {
    category: '13. 정보통신 연구개발직 및 공학기술직',
    codes: [
      { value: '131', label: '131 컴퓨터하드웨어ㆍ통신공학 기술자' },
      { value: '132', label: '132 컴퓨터시스템 전문가' },
      { value: '133', label: '133 소프트웨어 개발자' },
      { value: '134', label: '134 네트워크 시스템 개발자 및 정보보안 전문가' },
      { value: '135', label: '135 데이터 전문가' },
      { value: '136', label: '136 정보시스템 및 웹 운영자' },
      { value: '137', label: '137 통신‧방송송출 장비 기사' },
    ],
  },
  {
    category: '14. 건설ㆍ채굴 연구개발직 및 공학 기술직',
    codes: [{ value: '140', label: '140 건축ㆍ토목공학 기술자 및 시험원' }],
  },
  {
    category: '15. 제조 연구개발직 및 공학기술직',
    codes: [
      { value: '151', label: '151 기계ㆍ로봇공학 기술자 및 시험원' },
      { value: '152', label: '152 금속ㆍ재료공학 기술자 및 시험원' },
      { value: '153', label: '153 전기ㆍ전자공학 기술자 및 시험원' },
      { value: '154', label: '154 화학공학 기술자 및 시험원' },
      { value: '155', label: '155 에너지ㆍ환경공학 기술자 및 시험원' },
      { value: '156', label: '156 섬유공학 기술자 및 시험원' },
      { value: '157', label: '157 식품공학 기술자 및 시험원' },
      { value: '158', label: '158 소방ㆍ방재ㆍ산업안전ㆍ비파괴 기술자' },
      { value: '159', label: '159 제도사 및 기타 공학 기술자 및 시험원' },
    ],
  },
  {
    category: '21. 교육직',
    codes: [
      { value: '211', label: '211 대학 교수 및 강사' },
      { value: '212', label: '212 학교 교사' },
      { value: '213', label: '213 유치원 교사' },
      { value: '214', label: '214 문리ㆍ기술ㆍ예능 강사' },
      { value: '215', label: '215 장학관 및 기타 교육 종사자' },
    ],
  },
  {
    category: '22. 법률직',
    codes: [
      { value: '221', label: '221 법률 전문가' },
      { value: '222', label: '222 법률 사무원' },
    ],
  },
  {
    category: '23. 사회복지ㆍ종교직',
    codes: [
      { value: '231', label: '231 사회복지사 및 상담사' },
      { value: '232', label: '232 보육교사 및 기타 사회복지 종사자' },
      { value: '233', label: '233 성직자 및 기타 종교 종사자' },
    ],
  },
  {
    category: '24. 경찰ㆍ소방ㆍ교도직',
    codes: [{ value: '240', label: '240 경찰관, 소방관 및 교도관' }],
  },
  {
    category: '25. 군인',
    codes: [{ value: '250', label: '250 군인' }],
  },
  {
    category: '30. 보건의료직',
    codes: [
      { value: '301', label: '301 의사, 한의사 및 치과의사' },
      { value: '302', label: '302 수의사' },
      { value: '303', label: '303 약사 및 한약사' },
      { value: '304', label: '304 간호사' },
      { value: '305', label: '305 영양사' },
      { value: '306', label: '306 의료기사ㆍ치료사ㆍ재활사' },
      { value: '307', label: '307 보건ㆍ의료 종사자' },
    ],
  },
  {
    category: '41. 예술ㆍ디자인ㆍ방송직',
    codes: [
      { value: '411', label: '411 작가ㆍ통번역가' },
      { value: '412', label: '412 기자 및 언론 전문가' },
      { value: '413', label: '413 학예사ㆍ사서ㆍ기록물관리사' },
      { value: '414', label: '414 창작ㆍ공연 전문가(작가, 연극 제외)' },
      { value: '415', label: '415 디자이너' },
      { value: '416', label: '416 연극ㆍ영화ㆍ방송 전문가' },
      { value: '417', label: '417 문화ㆍ예술 기획자 및 매니저' },
    ],
  },
  {
    category: '42. 스포츠ㆍ레크리에이션직',
    codes: [{ value: '420', label: '420 스포츠ㆍ레크리에이션 종사자' }],
  },
  {
    category: '51. 미용․예식 및 반려동물 서비스직',
    codes: [
      { value: '511', label: '511 미용 서비스원' },
      { value: '512', label: '512 결혼․장례 등 예식 서비스원' },
      { value: '513', label: '513 반려동물 서비스원' },
    ],
  },
  {
    category: '52. 여행ㆍ숙박ㆍ오락 서비스직',
    codes: [
      { value: '521', label: '521 여행 서비스원' },
      { value: '522', label: '522 항공기ㆍ선박ㆍ열차 객실승무원' },
      { value: '523', label: '523 숙박시설 서비스원' },
      { value: '524', label: '524 오락시설 서비스원' },
    ],
  },
  {
    category: '53. 음식 서비스직',
    codes: [
      { value: '531', label: '531 주방장 및 조리사' },
      { value: '532', label: '532 식당 서비스원' },
    ],
  },
  {
    category: '54. 경호ㆍ경비직',
    codes: [
      { value: '541', label: '541 경호ㆍ보안 종사자' },
      { value: '542', label: '542 경비원' },
    ],
  },
  {
    category: '55. 돌봄서비스직(간병ㆍ육아)',
    codes: [{ value: '550', label: '550 돌봄 서비스 종사자' }],
  },
  {
    category: '56. 청소 및 기타 개인서비스직',
    codes: [
      { value: '561', label: '561 청소 종사자' },
      { value: '562', label: '562 세정원 및 방역원' },
      { value: '563', label: '563 가사 서비스원' },
      { value: '564', label: '564 검침·주차관리 및 기타 서비스 단순 종사자' },
    ],
  },
  {
    category: '61. 영업ㆍ판매직',
    codes: [
      { value: '611', label: '611 부동산 컨설턴트 및 중개사' },
      { value: '612', label: '612 기술·해외 영업원 및 상품중개인' },
      { value: '613', label: '613 자동차 및 제품 영업원' },
      { value: '614', label: '614 텔레마케터' },
      { value: '615', label: '615 판매 종사자' },
      { value: '616', label: '616 매장 계산원 및 매표원' },
      { value: '617', label: '617 판촉 및 기타 판매 단순 종사자' },
    ],
  },
  {
    category: '62. 운전ㆍ운송직',
    codes: [
      { value: '621', label: '621 항공기ㆍ선박ㆍ철도 조종사 및 관제사' },
      { value: '622', label: '622 자동차 운전원' },
      { value: '623', label: '623 물품이동장비 조작원(크레인ㆍ호이스트ㆍ지게차)' },
      { value: '624', label: '624 택배원 및 기타 운송 종사자' },
    ],
  },
  {
    category: '70. 건설ㆍ채굴직',
    codes: [
      { value: '701', label: '701 건설구조 기능원' },
      { value: '702', label: '702 건축마감 기능원' },
      { value: '703', label: '703 배관공' },
      { value: '704', label: '704 건설ㆍ채굴 기계 운전원' },
      { value: '705', label: '705 기타 건설 기능원(채굴포함)' },
      { value: '706', label: '706 건설ㆍ채굴 단순 종사자' },
    ],
  },
  {
    category: '81. 기계 설치ㆍ정비ㆍ생산직',
    codes: [
      { value: '811', label: '811 기계장비 설치·정비원(운송장비 제외)' },
      { value: '812', label: '812 운송장비 정비원' },
      { value: '813', label: '813 금형원 및 공작기계 조작원' },
      { value: '814', label: '814 냉·난방 설비 조작원' },
      { value: '815', label: '815 자동조립라인·산업용로봇 조작원' },
      { value: '816', label: '816 기계 조립원(운송장비 제외)' },
      { value: '817', label: '817 운송장비 조립원' },
    ],
  },
  {
    category: '82. 금속ㆍ재료ㆍ설치ㆍ정비ㆍ생산직(판금ㆍ단조ㆍ주조ㆍ용접ㆍ도장 등)',
    codes: [
      { value: '821', label: '821 금속관련 기계ㆍ설비 조작원' },
      { value: '822', label: '822 판금원 및 제관원' },
      { value: '823', label: '823 단조원 및 주조원' },
      { value: '824', label: '824 용접원 및 용접기 조작원' },
      { value: '825', label: '825 도장원 및 도금원' },
      { value: '826', label: '826 비금속제품 생산기계 조작원' },
    ],
  },
  {
    category: '83. 전기ㆍ전자 설치ㆍ정비ㆍ생산직',
    codes: [
      { value: '831', label: '831 전기공' },
      { value: '832', label: '832 전기ㆍ전자 기기 설치ㆍ수리원' },
      { value: '833', label: '833 발전ㆍ배전 장치 조작원' },
      { value: '834', label: '834 전기ㆍ전자 설비 조작원' },
      { value: '835', label: '835 전기ㆍ전자 부품ㆍ제품 생산기계 조작원' },
      { value: '836', label: '836 전기ㆍ전자 부품ㆍ제품 조립원' },
    ],
  },
  {
    category: '84. 정보통신 설치ㆍ정비직',
    codes: [
      { value: '841', label: '841 정보통신기기 설치ㆍ수리원' },
      { value: '842', label: '842 방송ㆍ통신장비 설치ㆍ수리원' },
    ],
  },
  {
    category: '85. 화학ㆍ환경 설치ㆍ정비ㆍ생산직',
    codes: [
      { value: '851', label: '851 석유ㆍ화학물 가공장치 조작원' },
      {
        value: '852',
        label: '852 고무ㆍ플라스틱 및 화학제품 생산기계 조작원 및 조립원',
      },
      { value: '853', label: '853 환경관련 장치 조작원' },
    ],
  },
  {
    category: '86. 섬유ㆍ의복생산직',
    codes: [
      { value: '861', label: '861 섬유 제조ㆍ가공 기계 조작원' },
      { value: '862', label: '862 패턴사, 재단사 및 재봉사' },
      { value: '863', label: '863 의복 제조원 및 수선원' },
      { value: '864', label: '864 제화원, 기타 섬유ㆍ의복 기계 조작원 및 조립원' },
    ],
  },
  {
    category: '87. 식품가공ㆍ생산직',
    codes: [
      { value: '871', label: '871 제과·제빵원 및 떡 제조원' },
      { value: '872', label: '872 식품 가공 기능원' },
      { value: '873', label: '873 식품 가공 기계 조작원' },
    ],
  },
  {
    category: '88. 인쇄ㆍ목재ㆍ공예 및 기타설치ㆍ정비ㆍ생산직',
    codes: [
      { value: '881', label: '881 인쇄기계ㆍ사진현상기 조작원' },
      { value: '882', label: '882 목재ㆍ펄프ㆍ종이 생산기계 조작원' },
      { value: '883', label: '883 가구ㆍ목제품 제조ㆍ수리원' },
      { value: '884', label: '884 공예원 및 귀금속세공원' },
      { value: '885', label: '885 악기ㆍ간판 및 기타 제조 종사자' },
    ],
  },
  {
    category: '89. 제조 단순직',
    codes: [{ value: '890', label: '890 제조 단순 종사자' }],
  },
  {
    category: '90. 농림어업직',
    codes: [
      { value: '901', label: '901 작물재배 종사자' },
      { value: '902', label: '902 낙농ㆍ사육 종사자' },
      { value: '903', label: '903 임업 종사자' },
      { value: '904', label: '904 어업 종사자' },
      { value: '905', label: '905 농림어업 단순 종사자' },
    ],
  },
] as const;

/**
 * 특수직종부호 (국민연금)
 */
export const SPECIAL_OCCUPATION_CODES = [
  { value: '0', label: '해당없음' },
  { value: '1', label: '1 - 광원' },
  { value: '2', label: '2 - 부원' },
] as const;

/**
 * 직역연금부호 (국민연금)
 */
export const OCCUPATIONAL_PENSION_CODES = [
  { value: '0', label: '해당없음' },
  { value: '1', label: '1 - 직역연금(공무원연금법, 군인연금법, 사립학교교직원 연금법, 별정우체국법에 따른 연금) 가입자' },
  { value: '2', label: '2 - 직역연금(공무원연금법, 군인연금법, 사립학교교직원 연금법, 별정우체국법에 따른 연금) 수급권자' },
] as const;

/**
 * 체류자격 코드 (외국인)
 */
export const RESIDENCE_STATUS_CODES = [
  { value: '41', label: '41 - 기여동포(F-4-1)' },
  { value: 'A1', label: 'A1 - 외교' },
  { value: 'A2', label: 'A2 - 공무' },
  { value: 'A3', label: 'A3 - 협정' },
  { value: 'B1', label: 'B1 - 사증면제' },
  { value: 'B2', label: 'B2 - 관광통과' },
  { value: 'C0', label: 'C0 - 재외국민' },
  { value: 'C1-1', label: 'C1 - 일시취재' },
  { value: 'C1-2', label: 'C1 - 유학(재외동포)' },
  { value: 'C2', label: 'C2 - 단기상용' },
  { value: 'C3', label: 'C3 - 단기종합' },
  { value: 'C4', label: 'C4 - 단기취업' },
  { value: 'C7', label: 'C7 - 난민등' },
  { value: 'C9', label: 'C9 - 유학(재외국인)' },
  { value: 'D1', label: 'D1 - 문화예술' },
  { value: 'D10', label: 'D10 - 구직' },
  { value: 'D2', label: 'D2 - 유학(외국인)' },
  { value: 'D3', label: 'D3 - 산업연수생' },
  { value: 'D4', label: 'D4 - 일반연수' },
  { value: 'D5', label: 'D5 - 취재' },
  { value: 'D6', label: 'D6 - 종교' },
  { value: 'D7', label: 'D7 - 주재' },
  { value: 'D8', label: 'D8 - 기업투자' },
  { value: 'D9', label: 'D9 - 무역경영' },
  { value: 'E1', label: 'E1 - 교수' },
  { value: 'E10', label: 'E10 - 선원취업' },
  { value: 'E2', label: 'E2 - 회화지도' },
  { value: 'E3', label: 'E3 - 연구' },
  { value: 'E4', label: 'E4 - 기술지도' },
  { value: 'E5', label: 'E5 - 전문직원' },
  { value: 'E6', label: 'E6 - 예술흥행' },
  { value: 'E7', label: 'E7 - 특정활동' },
  { value: 'E8', label: 'E8 - 연수취업' },
  { value: 'E9', label: 'E9 - 비전문취업' },
  { value: 'F1', label: 'F1 - 방문동거' },
  { value: 'F2', label: 'F2 - 거주' },
  { value: 'F3', label: 'F3 - 동반' },
  { value: 'F4', label: 'F4 - 외국국적동포' },
  { value: 'F5', label: 'F5 - 영주' },
  { value: 'F6', label: 'F6 - 결혼이민' },
  { value: 'G1', label: 'G1 - 기타(체류자격)' },
  { value: 'H1', label: 'H1 - 관광취업' },
  { value: 'H2', label: 'H2 - 방문취업' },
  { value: 'T1', label: 'T1 - 관광상륙' },
  { value: 'ZZ', label: 'ZZ - 기타' },
] as const;

/**
 * 피부양자 관계 코드
 */
export const DEPENDENT_RELATIONSHIP_CODES = [
  { value: '02', label: '02 - 배우자' },
  { value: '03', label: '03 - 부' },
  { value: '04', label: '04 - 모' },
  { value: '05', label: '05 - 자녀' },
  { value: '06', label: '06 - 며느리' },
  { value: '08', label: '08 - 사위' },
  { value: '10', label: '10 - 시부' },
  { value: '11', label: '11 - 시모' },
  { value: '12', label: '12 - 장인' },
  { value: '13', label: '13 - 장모' },
  { value: '18', label: '18 - 양부' },
  { value: '19', label: '19 - 양모' },
  { value: '1A', label: '1A - 외증손' },
  { value: '20', label: '20 - 형' },
  { value: '22', label: '22 - 제' },
  { value: '30', label: '30 - 누이' },
  { value: '32', label: '32 - 매' },
  { value: '3A', label: '3A - 언니' },
  { value: '40', label: '40 - 손' },
  { value: '43', label: '43 - 증손' },
  { value: '48', label: '48 - 오빠' },
  { value: '49', label: '49 - 배우자의 자녀' },
  { value: '50', label: '50 - 조부' },
  { value: '51', label: '51 - 조모' },
  { value: '6A', label: '6A - 누나' },
  { value: '76', label: '76 - 외손' },
  { value: '78', label: '78 - 외조부' },
  { value: '79', label: '79 - 외조모' },
  { value: 'A7', label: 'A7 - 기타' },
  { value: 'A8', label: 'A8 - 처조부' },
  { value: 'A9', label: 'A9 - 처조모' },
  { value: 'B6', label: 'B6 - 처(사실혼)' },
  { value: 'B7', label: 'B7 - 남편(사실혼)' },
] as const;

/**
 * 피부양자 장애인·국가유공자 종별부호
 */
export const DISABILITY_TYPE_CODES = [
  { value: '1', label: '1 - 지체장애인' },
  { value: '2', label: '2 - 뇌병변장애인' },
  { value: '3', label: '3 - 시각장애인' },
  { value: '4', label: '4 - 청각장애인' },
  { value: '5', label: '5 - 언어장애인' },
  { value: '6', label: '6 - 지적장애인' },
  { value: '7', label: '7 - 자폐성장애인' },
  { value: '8', label: '8 - 정신장애인' },
  { value: '9', label: '9 - 신장장애인' },
  { value: '10', label: '10 - 심장장애인' },
  { value: '11', label: '11 - 호흡기장애인' },
  { value: '12', label: '12 - 간 장애인' },
  { value: '13', label: '13 - 안면장애인' },
  { value: '14', label: '14 - 장루ㆍ요루장애인' },
  { value: '15', label: '15 - 뇌전증장애인' },
  { value: '19', label: '19 - 국가유공자 등 또는 보훈보상대상자' },
] as const;

/**
 * 보험료부과구분 (해당자만 선택)
 */
export const PREMIUM_IMPOSITION_TYPES = [
  { value: '0', label: '해당없음' },
  { value: '51', label: '51 - 고용보험미가입 외국인근로자 등' },
  { value: '52', label: '52 - 현장실습생, 항운노조원(수급자)' },
  { value: '54', label: '54 - 자활근로종사자(국민기초생활보장법)' },
  { value: '55', label: '55 - 청원경찰, 산업법·어선법 적용자, 해외파견자' },
  { value: '56', label: '56 - 노조전임자' },
  { value: '58', label: '58 - 자활근로종사자(생계급여 수급자)' },
  { value: '60', label: '60 - 고등학교 외국인근로자' },
] as const;

/**
 * 사유 코드 (고용보험·산재보험)
 */
export const REASON_CODES = [
  { value: '03', label: '03. 현장실습생(「산업재해보상보험법」 제123조제1항에 따른 고용노동부장관이 정하는 현장실습생)' },
  { value: '05', label: '05. 국가기관에서 근무하는 청원경찰' },
  { value: '06', label: '06. 「선원법」 및 「어선원 및 어선 재해보상보험법」적용자' },
  { value: '07', label: '07. 해외파견자(「산업재해보상보험법」의 적용을 받지 않는 사람)' },
  { value: '09', label: '09. 고용보험미가입 외국인근로자' },
  { value: '10', label: '10. 월 60시간 미만 근로자' },
  { value: '11', label: '11. 항운노조원(임금채권부담금 부과대상)' },
  { value: '13', label: '13. 항운노조원(임금채권부담금 소송승소)' },
  { value: '16', label: '16. 노조전임자(노동조합 등 금품 지급)' },
  { value: '21', label: '21. 자활근로종사자(생계급여 수급자)' },
  { value: '22', label: '22. 자활근로종사자(「국민기초생활보장법」 제14조의2에 따른 급여의 특례에 해당하는 사람, 차상위계층, 주거ㆍ의료ㆍ교육급여 수급자)' },
  { value: '27', label: '27. 고용허가 외국인근로자(당연적용대상)' },
] as const;

// ==================== 자격 상실신고 관련 타입 및 상수 ====================

/**
 * 국민연금 상실부호
 */
export const PENSION_LOSS_CODES = [
  { value: '1', label: '1 - 사망' },
  { value: '3', label: '3 - 사용관계 종료' },
  { value: '4', label: '4 - 국적 상실(국외 이주)' },
  { value: '5', label: '5 - 60세 도달' },
  { value: '6', label: '6 - 다른 공적연금 가입' },
  { value: '9', label: '9 - 전출(통ㆍ폐합)' },
  { value: '15', label: '15 - (조기)노령연금 수급권 취득' },
  { value: '16', label: '16 - 협정국 연금가입' },
  { value: '19', label: '19 - 체류기간 만료(외국인)' },
  { value: '20', label: '20 - 적용제외 체류자격(외국인)' },
  { value: '21', label: '21 - 무보수 대표이사' },
  { value: '22', label: '22 - 근로자 제외' },
  { value: '26', label: '26 - 취득취소(착오나 사정변경으로 자격취득 신고를 취소하는 경우)' },
] as const;

/**
 * 건강보험 상실부호
 */
export const HEALTH_LOSS_CODES = [
  { value: '1', label: '1 - 퇴직' },
  { value: '2', label: '2 - 사망' },
  { value: '4', label: '4 - 의료급여수급권자' },
  { value: '10', label: '10 - 유공자등 건강보험 적용배제신청' },
  { value: '13', label: '13 - 그 밖의 사유(외국인 당연적용 제외 등)' },
  { value: '16', label: '16 - 취득취소(착오나 사정변경으로 자격취득 신고를 취소하는 경우)' },
  { value: '17', label: '17 - 국적상실' },
  { value: '19', label: '19 - 이민출국' },
  { value: '24', label: '24 - 가입제외(외국의 법령)' },
  { value: '25', label: '25 - 가입제외(외국의 보험)' },
  { value: '26', label: '26 - 가입제외(사용자와의 계약)' },
  { value: '58', label: '58 - 무보수대표자' },
] as const;

/**
 * 고용보험·산재보험 상실사유코드
 */
export const EMPLOYMENT_LOSS_CODES = [
  { value: '11', label: '11 - 개인사정으로 인한 자진퇴사' },
  { value: '12', label: '12 - 사업장 이전, 근로조건 변동, 임금체불 등으로 자진퇴사' },
  { value: '22', label: '22 - 폐업ㆍ도산' },
  { value: '23', label: '23 - 경영상 필요 및 회사불황으로 인한 인원감축 등에 따른 퇴사(해고ㆍ권고사직ㆍ명예퇴직 포함)' },
  { value: '26', label: '26 - 근로자 귀책사유에 의한 징계해고ㆍ권고사직ㆍ계약해지' },
  { value: '31', label: '31 - 정년' },
  { value: '32', label: '32 - 계약기간 만료, 공사 종료' },
  { value: '41', label: '41 - 고용보험 비적용' },
  { value: '42', label: '42 - 이중고용' },
] as const;

/**
 * 직원 상실신고 정보
 */
export interface EmployeeLossInfo {
  // 기본 정보
  employeeId?: string; // 직원 ID (기존 직원 선택 시)
  employeeNumber?: string; // 사번 (기존 직원 선택 시)
  name: string; // 성명
  residentNumber: string; // 주민등록번호/외국인등록번호
  phoneNumber?: string; // 전화번호(휴대전화)
  lossDate: string; // 상실연월일 (YYYY-MM-DD)

  // 보험 신청 여부
  applyPension: boolean; // 국민연금 신고 여부
  applyHealthInsurance: boolean; // 건강보험 신고 여부
  applyEmploymentInsurance: boolean; // 고용보험 신고 여부
  applyWorkersCompensation: boolean; // 산재보험 신고 여부

  // 국민연금
  pensionLossCode?: string; // 상실부호
  pensionPayFirstDayLoss?: boolean; // 초일취득ㆍ당월상실자 납부여부

  // 건강보험
  healthLossCode?: string; // 상실부호
  healthCurrentYearSalary?: number; // 연간보수총액(해당연도)
  healthPreviousYearSalary?: number; // 연간보수총액(전년도)
  healthCurrentYearMonths?: number; // 근무개월수(해당연도)
  healthPreviousYearMonths?: number; // 근무개월수(전년도)
  healthNoPreviousYearTaxAdjustment?: boolean; // 전년도 연말정산을 실시하지 않았는지 여부

  // 고용보험·산재보험
  employmentLossCode?: string; // 상실사유코드
  employmentSpecificReason?: string; // 구체적 사유
  hasSalaryDifferenceBetweenInsurances?: boolean; // 고용보험과 산재보험 보수총액 차이 여부
  noPreviousYearSalaryReport?: boolean; // 전년도 보수총액 신고 안함 여부
  employmentCurrentYearSalary?: number; // 고용보험 해당연도 보수총액
  employmentPreviousYearSalary?: number; // 고용보험 전년도 보수총액
  workersCompCurrentYearSalary?: number; // 산재보험 해당연도 보수총액
  workersCompPreviousYearSalary?: number; // 산재보험 전년도 보수총액
}

/**
 * 자격상실 신고서 전체 데이터
 */
export interface InsuranceLossForm {
  // 사업장 정보
  workplace: WorkplaceInfo;

  // 보험사무 대행기관 (선택)
  agency?: AgencyInfo;

  // 직장가입자 목록
  employees: EmployeeLossInfo[];

  // 신고 정보
  reportDate: string; // 보고 연월일 (YYYY-MM-DD)
  reporterSignature?: string; // 신고인 서명/인
  agencySignature?: string; // 보험사무대행기관 서명/인

  // 임시 저장 메타데이터
  savedAt?: string; // 저장 시각
}

// ==================== 보수월액 변경 관련 타입 및 상수 ====================

/**
 * 직원 보수월액 변경 정보
 */
export interface EmployeeSalaryChangeInfo {
  // 기본 정보
  employeeId?: string; // 직원 ID (기존 직원 선택 시)
  employeeNumber?: string; // 사번 (기존 직원 선택 시)
  name: string; // 성명
  residentNumber: string; // 주민등록번호/외국인등록번호
  changeMonth: string; // 보수 변경 월 (YYYY-MM)
  changeReason: string; // 변경사유

  // 보험 신청 여부
  applyPension: boolean; // 국민연금 신고 여부
  applyHealthInsurance: boolean; // 건강보험 신고 여부
  applyEmploymentInsurance: boolean; // 고용보험 신고 여부
  applyWorkersCompensation: boolean; // 산재보험 신고 여부

  // 국민연금
  pensionCurrentIncome?: number; // 현재 기준소득월액
  pensionChangedIncome?: number; // 변경 기준소득월액
  pensionWorkerConsent?: boolean; // 근로자 동의(서명 또는 인)

  // 건강보험
  healthChangedSalary?: number; // 변경 후 보수월액
  healthChangeMonth?: number; // 보수 변경 월 (1~12)
  healthChangeReason?: string; // 변경사유

  // 고용보험·산재보험
  isDifferentEmploymentWorkersCompSalary?: boolean; // 고용보험과 산재보험의 변경 후 월평균보수 다름 여부
  employmentChangedSalary?: number; // 변경 후 월평균보수(고용보험)
  workersCompChangedSalary?: number; // 변경 후 월평균보수(산재보험)
  employmentWorkersCompChangeMonth?: number; // 보수 변경 월 (1~12)
  employmentWorkersCompChangeReason?: string; // 변경사유
}

/**
 * 보수월액 변경신청서 전체 데이터
 */
export interface InsuranceSalaryChangeForm {
  // 사업장 정보
  workplace: WorkplaceInfo;

  // 직장가입자 목록
  employees: EmployeeSalaryChangeInfo[];

  // 신고 정보
  reportDate: string; // 보고 연월일 (YYYY-MM-DD)

  // 임시 저장 메타데이터
  savedAt?: string; // 저장 시각
}

// ==================== 피부양자 관리 관련 타입 및 상수 ====================

/**
 * 피부양자 취득(상실) 부호
 */
export const DEPENDENT_ACQUISITION_LOSS_CODES = [
  // 취득 부호
  { value: '03', label: '03 - (취득사유) 출생', type: 'acquisition' },
  { value: '04-취득', label: '04 - (취득사유) 외국국적을 상실하고 취득자로서 재외', type: 'acquisition' },
  { value: '05', label: '05 - (취득사유) 직장가입자 변경', type: 'acquisition' },
  { value: '06', label: '06 - (취득사유) 피부양자 상실', type: 'acquisition' },
  { value: '07', label: '07 - (취득사유) 직장가입자에서 변경', type: 'acquisition' },
  // 상실 부호
  { value: '02', label: '02 - (상실사유) 사망', type: 'loss' },
  { value: '04-상실', label: '04 - (상실사유) 외국국적을 상실하고자를 취득', type: 'loss' },
  { value: '10', label: '10 - (상실사유) 유공자를 긴급보장 배제신청', type: 'loss' },
  { value: '14', label: '14 - (상실사유) 지주불동등', type: 'loss' },
  { value: '17', label: '17 - (상실사유) 국적 상실', type: 'loss' },
  { value: '18', label: '18 - (상실사유) 의국민(지역국민)으로서 출국', type: 'loss' },
  { value: '19', label: '19 - (상실사유) 이민출국', type: 'loss' },
  { value: '21', label: '21 - (상실사유) 행방불명', type: 'loss' },
  { value: '13', label: '13 - (상실사유) 기타', type: 'loss' },
] as const;

/**
 * 피부양자 관리용 확장 정보
 */
export interface DependentWithManagementInfo extends Dependent {
  acquisitionOrLossType?: 'acquisition' | 'loss'; // 구분 (취득/상실)
  acquisitionOrLossDate?: string; // 취득(상실)일자 (YYYY-MM-DD)
  acquisitionOrLossCode?: string; // 취득(상실)부호
}

/**
 * 직원별 피부양자 관리 정보
 */
export interface EmployeeDependentManagement {
  // 직원 기본 정보
  employeeId?: string; // 직원 ID (기존 직원 선택 시)
  employeeNumber?: string; // 사번
  name: string; // 성명
  residentNumber: string; // 주민등록번호/외국인등록번호
  phoneNumber?: string; // 전화번호(휴대전화)

  // 피부양자 목록
  dependents: DependentWithManagementInfo[];
}

/**
 * 피부양자 관리 신고서 전체 데이터
 */
export interface DependentManagementForm {
  // 사업장 정보
  workplace: {
    managementNumber: string; // 사업장관리번호
    name: string; // 명칭
    phoneNumber: string; // 전화번호
  };

  // 직원별 피부양자 관리
  employees: EmployeeDependentManagement[];

  // 신고 정보
  reportDate: string; // 보고 연월일 (YYYY-MM-DD)

  // 임시 저장 메타데이터
  savedAt?: string; // 저장 시각
}

/**
 * 피부양자 관리 신고내역
 */
export interface DependentManagementHistory {
  id: string; // 고유 ID
  reportDate: string; // 신고일자 (YYYY-MM-DD)
  workplace: {
    managementNumber: string;
    name: string;
    phoneNumber: string;
  };
  employees: EmployeeDependentManagement[];
  createdAt: string; // 생성 시각 (ISO 8601)
}

// ==================== 신고/신청 내역 관련 타입 ====================

/**
 * 자격취득 신고내역
 */
export interface InsuranceAcquisitionHistory {
  id: string; // 고유 ID
  reportDate: string; // 신고일자 (YYYY-MM-DD)
  workplace: WorkplaceInfo; // 사업장 정보
  employees: EmployeeInsuranceInfo[]; // 직원 목록
  createdAt: string; // 생성 시각 (ISO 8601)
}

/**
 * 자격상실 신고내역
 */
export interface InsuranceLossHistory {
  id: string; // 고유 ID
  reportDate: string; // 신고일자 (YYYY-MM-DD)
  workplace: WorkplaceInfo; // 사업장 정보
  employees: EmployeeLossInfo[]; // 직원 목록
  createdAt: string; // 생성 시각 (ISO 8601)
}

/**
 * 보수월액 변경 신청내역
 */
export interface InsuranceSalaryChangeHistory {
  id: string; // 고유 ID
  reportDate: string; // 신청일자 (YYYY-MM-DD)
  workplace: WorkplaceInfo; // 사업장 정보
  employees: EmployeeSalaryChangeInfo[]; // 직원 목록
  createdAt: string; // 생성 시각 (ISO 8601)
}

/**
 * 보수총액신고 직원 정보
 */
export interface EmployeeTotalSalaryInfo {
  // 기본 정보
  employeeId?: string; // 직원 ID
  employeeNumber: string; // 사번
  name: string; // 성명
  residentNumber: string; // 주민등록번호/외국인등록번호
  reportYear: string; // 신고년도 (YYYY)
  acquisitionDate?: string; // 자격취득일 (YYYY-MM-DD)

  // 보험 적용 여부
  applyPension: boolean; // 국민연금
  applyHealthInsurance: boolean; // 건강보험
  applyEmploymentInsurance: boolean; // 고용보험
  applyWorkersCompensation: boolean; // 산재보험

  // 보수총액
  pensionReportType?: string; // 국민연금 신고유형
  pensionTotalSalary: number; // 국민연금 보수총액
  pensionWorkStartDate?: string; // 국민연금 근무시작일 (MM-DD)
  pensionHasLeave?: boolean; // 국민연금 휴직 여부
  pensionLeaveDays?: number; // 국민연금 실제 휴직일수
  healthTotalSalary: number; // 건강보험 보수총액
  healthWorkMonths?: number; // 건강보험 근무개월수 (1-12)
  healthInsurancePremiumTotal?: number; // 건강보험 보험료 부과 총액
  employmentTotalSalary: number; // 고용보험 보수총액
  workersCompTotalSalary: number; // 산재보험 보수총액
}

/**
 * 보수총액신고 폼 데이터
 */
export interface InsuranceTotalSalaryForm {
  workplace: WorkplaceInfo; // 사업장 정보
  employees: EmployeeTotalSalaryInfo[]; // 직원 목록
  reportDate: string; // 신고일자 (YYYY-MM-DD)
}

/**
 * 보수총액 신고내역
 */
export interface InsuranceTotalSalaryHistory {
  id: string; // 고유 ID
  reportDate: string; // 신고일자 (YYYY-MM-DD)
  workplace: WorkplaceInfo; // 사업장 정보
  employees: EmployeeTotalSalaryInfo[]; // 직원 목록
  createdAt: string; // 생성 시각 (ISO 8601)
}

