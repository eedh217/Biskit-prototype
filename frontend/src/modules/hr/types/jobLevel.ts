export interface JobLevel {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobLevelDto {
  name: string;
}

export interface UpdateJobLevelDto {
  name: string;
}
