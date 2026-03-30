import { employeeService } from './employeeService';
import { organizationService } from './organizationService';
import { jobLevelService } from './jobLevelService';
import { employmentTypeService } from './employmentTypeService';
import type { CreateEmployeeDto } from '../types/employee';
import { BANKS } from '@/shared/constants/banks';

// 한국식 성씨
const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전'];

// 한국식 이름
const firstNames = [
  '민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '준서', '건우',
  '서연', '서윤', '지우', '서현', '민서', '하은', '윤서', '지유', '채원', '수아',
  '지훈', '현우', '태양', '민재', '승현', '정우', '현준', '우진', '지환', '성민',
  '수빈', '예은', '다은', '은서', '채은', '소율', '지안', '유진', '예린', '가은',
  '준영', '동현', '재윤', '승우', '지원', '재현', '시현', '민우', '성준', '상우'
];

// 이메일 도메인
const emailDomains = ['company.com', 'biskit.com', 'corp.kr'];

// 랜덤 날짜 생성 (YYYYMMDD)
function getRandomDate(startYear: number, endYear: number): string {
  const year = startYear + Math.floor(Math.random() * (endYear - startYear + 1));
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28); // 간단하게 28일까지만

  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

// 랜덤 전화번호 생성
function getRandomPhone(): string {
  const middle = String(1000 + Math.floor(Math.random() * 9000));
  const last = String(1000 + Math.floor(Math.random() * 9000));
  return `010${middle}${last}`;
}

// 주민등록번호 생성 (앞 6자리만, 뒤는 1234567로 통일)
function getResidentNumber(birthDate: string): string {
  const year = birthDate.substring(2, 4);
  const month = birthDate.substring(4, 6);
  const day = birthDate.substring(6, 8);
  const yearFull = parseInt(birthDate.substring(0, 4));
  const genderCode = yearFull >= 2000 ? '3' : '1'; // 남성 기준

  return `${year}${month}${day}-${genderCode}234567`;
}

// 랜덤 계좌번호 생성
function getRandomAccountNumber(): string {
  const part1 = String(100 + Math.floor(Math.random() * 900)); // 3자리
  const part2 = String(100000 + Math.floor(Math.random() * 900000)); // 6자리
  const part3 = String(10000 + Math.floor(Math.random() * 90000)); // 5자리
  return `${part1}-${part2}-${part3}`;
}

// 랜덤 급여 생성
function getRandomSalary(): { salaryType: '연봉' | '시급'; salaryAmount: number; mealAllowance: number } {
  const salaryType = Math.random() < 0.7 ? '연봉' : '시급'; // 70% 연봉, 30% 시급

  if (salaryType === '연봉') {
    // 연봉: 2400만원 ~ 1억원
    const salaryAmount = 24000000 + Math.floor(Math.random() * 76000000);
    // 월 식대: 0 ~ 20만원
    const mealAllowance = Math.floor(Math.random() * 200000);
    return { salaryType, salaryAmount, mealAllowance };
  } else {
    // 시급: 9,620원 ~ 50,000원
    const salaryAmount = 9620 + Math.floor(Math.random() * 40380);
    // 일 식대: 0 ~ 10,000원
    const mealAllowance = Math.floor(Math.random() * 10000);
    return { salaryType, salaryAmount, mealAllowance };
  }
}

export async function seedEmployees(): Promise<void> {
  try {
    console.log('🌱 Starting employee seed...');

    // 기존 데이터 확인
    let organizations = await organizationService.getAll();
    let jobLevels = await jobLevelService.getList();
    let employmentTypes = await employmentTypeService.getList();

    // 부서가 없으면 더미 부서 생성
    if (organizations.length === 0) {
      console.log('📁 Creating dummy departments...');

      // 1depth: 회사 본부들
      const rootDepts = [
        { name: '경영지원본부', order: 0 },
        { name: '개발본부', order: 1 },
        { name: '영업본부', order: 2 },
      ];

      const createdRootDepts: string[] = [];
      for (const dept of rootDepts) {
        const created = await organizationService.create({
          name: dept.name,
          parentId: null,
          order: dept.order,
        });
        createdRootDepts.push(created.id);
        console.log(`  ✅ Created: ${dept.name}`);
      }

      // 2depth: 하위 부서들
      const subDepts = [
        { name: '인사팀', parentIndex: 0, order: 0 },
        { name: '재무팀', parentIndex: 0, order: 1 },
        { name: '총무팀', parentIndex: 0, order: 2 },
        { name: '프론트엔드팀', parentIndex: 1, order: 0 },
        { name: '백엔드팀', parentIndex: 1, order: 1 },
        { name: 'DevOps팀', parentIndex: 1, order: 2 },
        { name: '국내영업팀', parentIndex: 2, order: 0 },
        { name: '해외영업팀', parentIndex: 2, order: 1 },
      ];

      for (const dept of subDepts) {
        const parentId = createdRootDepts[dept.parentIndex];
        if (!parentId) {
          console.error(`  ❌ Parent department not found for ${dept.name}`);
          continue;
        }
        await organizationService.create({
          name: dept.name,
          parentId,
          order: dept.order,
        });
        console.log(`  ✅ Created: ${dept.name}`);
      }

      organizations = await organizationService.getAll();
      console.log(`✅ Created ${organizations.length} departments`);
    }

    // 직급이 없으면 더미 직급 생성
    if (jobLevels.length === 0) {
      console.log('📊 Creating dummy job levels...');

      const levels = ['사원', '대리', '과장', '차장', '부장', '이사'];

      for (const level of levels) {
        await jobLevelService.create({ name: level });
        console.log(`  ✅ Created: ${level}`);
      }

      jobLevels = await jobLevelService.getList();
      console.log(`✅ Created ${jobLevels.length} job levels`);
    }

    // 근로형태가 없으면 더미 근로형태 생성
    if (employmentTypes.length === 0) {
      console.log('💼 Creating dummy employment types...');

      const types = ['정규직', '계약직', '인턴', '프리랜서'];

      for (const type of types) {
        await employmentTypeService.create({ name: type });
        console.log(`  ✅ Created: ${type}`);
      }

      employmentTypes = await employmentTypeService.getList();
      console.log(`✅ Created ${employmentTypes.length} employment types`);
    }

    console.log(`✅ Found ${organizations.length} departments`);
    console.log(`✅ Found ${jobLevels.length} job levels`);
    console.log(`✅ Found ${employmentTypes.length} employment types`);

    // 부서장 목록 (각 부서당 1명씩)
    const departmentHeadAssignments = new Set<string>();

    // 50명의 더미 직원 생성
    for (let i = 1; i <= 50; i++) {
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const name = `${lastName}${firstName}`;

      const employeeNumber = `EMP${String(i).padStart(3, '0')}`;

      // 생년월일 (1970~2000년)
      const birthDate = getRandomDate(1970, 2000);

      // 이메일
      const emailDomain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
      const email = `${(lastName || 'test').toLowerCase()}${(firstName || 'user').toLowerCase()}${i}@${emailDomain}`;

      // 전화번호
      const phone = getRandomPhone();

      // 주민등록번호
      const residentNumber = getResidentNumber(birthDate);

      // 입사일 (2015~2024년)
      const joinDate = getRandomDate(2015, 2024);

      // 퇴사일 (10% 확률로 퇴사)
      let leaveDate: string | null = null;
      if (Math.random() < 0.1) {
        const joinYear = parseInt(joinDate.substring(0, 4));
        leaveDate = getRandomDate(joinYear + 1, 2024);
      }

      // 부서 랜덤 배정
      const department = organizations[Math.floor(Math.random() * organizations.length)];
      if (!department) continue;

      // 직급 랜덤 배정
      const jobLevel = jobLevels[Math.floor(Math.random() * jobLevels.length)];
      if (!jobLevel) continue;

      // 고용형태 랜덤 배정
      const employmentType = employmentTypes[Math.floor(Math.random() * employmentTypes.length)];
      if (!employmentType) continue;

      // 부서장 여부 (각 부서당 1명, 퇴사자는 부서장 불가)
      let isDepartmentHead = false;
      if (!departmentHeadAssignments.has(department.id) && !leaveDate) {
        if (Math.random() < 0.3) { // 30% 확률로 부서장 배정
          isDepartmentHead = true;
          departmentHeadAssignments.add(department.id);
        }
      }

      // 급여정보 생성 (80% 확률로 생성)
      const hasSalary = Math.random() < 0.8;
      const salary = hasSalary ? getRandomSalary() : null;

      // 계좌정보 생성 (급여정보가 있는 경우 90% 확률로 생성)
      const hasAccount = hasSalary && Math.random() < 0.9;
      const bank = hasAccount ? BANKS[Math.floor(Math.random() * BANKS.length)] : null;
      const accountNumber = hasAccount ? getRandomAccountNumber() : null;

      const employeeDto: CreateEmployeeDto = {
        employeeNumber,
        name,
        nationalityType: 'domestic',
        residentRegistrationNumber: residentNumber,
        residenceType: 'resident',
        disabilityType: 'none',
        email,
        phone,
        joinDate,
        leaveDate: leaveDate || undefined,
        departmentId: department.id,
        position: jobLevel.id,
        employmentTypeId: employmentType.id,
        isDepartmentHead,
        salaryType: salary?.salaryType || null,
        salaryAmount: salary?.salaryAmount || null,
        mealAllowance: salary?.mealAllowance || null,
        bankName: bank?.name || null,
        accountHolder: hasAccount ? name : null,
        accountNumber: accountNumber,
      };

      await employeeService.create(employeeDto);
      console.log(`✅ Created employee ${i}/50: ${name} (${employeeNumber})`);
    }

    console.log('🎉 Successfully created 50 employees!');
  } catch (error) {
    console.error('❌ Error seeding employees:', error);
    throw error;
  }
}
