declare global {
  namespace App {
    interface Platform {
      env?: {
        API?: { fetch(request: Request): Promise<Response> };
      };
    }
  }
}

export {};
