export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string | null;
  createdAt?: Date | string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}
