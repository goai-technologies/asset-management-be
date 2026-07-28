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
