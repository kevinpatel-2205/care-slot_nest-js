export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
}

export interface RegisterResponse {
  message: string;
  token: string;
  data: SafeUser;
}

export interface LoginResponse {
  message: string;
  token: string;
  data: {
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
