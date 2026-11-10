export function bufferDecode(value: string): Uint8Array {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function bufferEncode(value: ArrayBuffer): string {
  return window.btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function registerPasskey(tsapId: string, token: string): Promise<{ success: boolean; message?: string }> {
  try {
    const resBegin = await fetch("/api/auth/passkey/register/begin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tsap-Token": token },
      body: JSON.stringify({ tsap_id: tsapId })
    });
    if (!resBegin.ok) return { success: false, message: "Failed to begin registration" };
    const { options, challenge_id } = await resBegin.json();
    
    options.challenge = bufferDecode(options.challenge);
    options.user.id = bufferDecode(options.user.id);
    if (options.excludeCredentials) {
      options.excludeCredentials.forEach((c: any) => c.id = bufferDecode(c.id));
    }
    
    const credential = await navigator.credentials.create({ publicKey: options }) as any;
    
    const response = {
      id: credential.id,
      rawId: bufferEncode(credential.rawId),
      type: credential.type,
      response: {
        attestationObject: bufferEncode(credential.response.attestationObject),
        clientDataJSON: bufferEncode(credential.response.clientDataJSON),
        transports: credential.response.getTransports ? credential.response.getTransports() : []
      }
    };
    
    const resFinish = await fetch("/api/auth/passkey/register/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tsap-Token": token },
      body: JSON.stringify({ tsap_id: tsapId, challenge_id, response })
    });
    
    const data = await resFinish.json();
    return { success: data.success, message: data.message_telugu || data.detail };
  } catch (e: any) {
    console.error("Passkey reg error:", e);
    return { success: false, message: e.message || "Passkey registration failed" };
  }
}

export async function loginPasskey(): Promise<{ success: boolean; tsap_id?: string; auth_token?: string; message?: string }> {
  try {
    const resBegin = await fetch("/api/auth/passkey/login/begin", {
      method: "POST"
    });
    if (!resBegin.ok) return { success: false, message: "Failed to begin login" };
    const { options, challenge_id } = await resBegin.json();
    
    options.challenge = bufferDecode(options.challenge);
    if (options.allowCredentials) {
      options.allowCredentials.forEach((c: any) => c.id = bufferDecode(c.id));
    }
    
    const credential = await navigator.credentials.get({ publicKey: options }) as any;
    
    const response = {
      id: credential.id,
      rawId: bufferEncode(credential.rawId),
      type: credential.type,
      response: {
        authenticatorData: bufferEncode(credential.response.authenticatorData),
        clientDataJSON: bufferEncode(credential.response.clientDataJSON),
        signature: bufferEncode(credential.response.signature),
        userHandle: credential.response.userHandle ? bufferEncode(credential.response.userHandle) : undefined,
      }
    };
    
    const resFinish = await fetch("/api/auth/passkey/login/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge_id, response })
    });
    
    const data = await resFinish.json();
    return { 
      success: data.success, 
      tsap_id: data.tsap_id, 
      auth_token: data.auth_token, 
      message: data.message_telugu || data.detail 
    };
  } catch (e: any) {
    console.error("Passkey login error:", e);
    return { success: false, message: e.message || "Passkey login failed" };
  }
}
