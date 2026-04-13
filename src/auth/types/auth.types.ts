export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
}

export interface RegisterResponse {
  message: string;
  data: SafeUser;
}

export interface LoginResponse {
  message: string;
  data: {
    token: string;
    user: SafeUser;
  };
}

export interface GetMeResponse {
  message?: string;
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    patient?: unknown;
    doctor?: unknown;
  };
}

export interface UpdatePasswordResponse {
  message: string;
}
