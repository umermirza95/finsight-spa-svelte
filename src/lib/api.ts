export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, init);
    
    if (response.status === 401) {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        
        // Do not redirect if the 401 comes from the login endpoint itself
        if (!urlStr.includes('/api/Auth/login')) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
            }
        }
    }
    
    return response;
}
