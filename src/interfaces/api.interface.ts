export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string[];
}

export interface AuthUserProfile {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUserProfile;
}

export type AppRole = "administrator" | "it_team" | "employee";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

export interface UpdateUserRoleResult {
  accessToken?: string;
  user?: AuthUserProfile;
}
