export interface EmploymentType {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmploymentTypeDto {
  name: string;
}

export interface UpdateEmploymentTypeDto {
  name: string;
}
