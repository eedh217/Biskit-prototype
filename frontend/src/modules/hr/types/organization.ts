export interface Organization {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationNode extends Organization {
  children: OrganizationNode[];
}

export interface CreateOrganizationDto {
  name: string;
  parentId: string | null;
  order: number;
}

export interface UpdateOrganizationDto {
  name: string;
}

export interface ReorderOrganizationDto {
  id: string;
  parentId: string | null;
  order: number;
}
