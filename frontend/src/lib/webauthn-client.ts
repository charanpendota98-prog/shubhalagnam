import { confirmedAuthAck, confirmedAuthSession } from "./auth-confirmation";

export function bufferDecode(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function bufferEncode(value: ArrayBuffer): string {
  return window.btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function registerPasskey(tsapId: string, token: string, password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const resBegin = await fetch("/api/auth/passkey/register/begin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tsap-Token": token },
      body: JSON.stringify({ tsap_id: tsapId, password })
    });
    const unconfirmed = { success: false, message: "Passkey setup could not be confirmed. Try again." };
    if (resBegin.status !== 200) return unconfirmed;
    const begin: unknown = await resBegin.json();
    if (!confirmedAuthAck(begin) || begin.error || begin.detail ||
        typeof begin.challenge_id !== "string" || !begin.challenge_id.trim() ||
        !begin.options || typeof begin.options !== "object" || Array.isArray(begin.options)) return unconfirmed;
    const { options, challenge_id } = begin as {
      challenge_id: string;
      options: Omit<PublicKeyCredentialCreationOptions, "challenge" | "user" | "excludeCredentials"> & {
        challenge: string;
        user: Omit<PublicKeyCredentialUserEntity, "id"> & {id: string};
        excludeCredentials?: (Omit<PublicKeyCredentialDescriptor, "id"> & {id: string})[];
      };
    };
    if (typeof options.challenge !== "string" || !options.challenge || !options.user ||
        typeof options.user.id !== "string" || !options.user.id ||
        (options.excludeCredentials !== undefined && !Array.isArray(options.excludeCredentials))) return unconfirmed;
    const publicKey: PublicKeyCredentialCreationOptions = {
      ...options, challenge: bufferDecode(options.challenge),
      user: {...options.user, id: bufferDecode(options.user.id)},
      excludeCredentials: options.excludeCredentials?.map(c => ({...c, id: bufferDecode(c.id)})),
    };
    /* decoded options are kept separate from the response object. */
    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
    if (!credential || credential.type !== "public-key") return unconfirmed;
    const attestation = credential.response as AuthenticatorAttestationResponse;

    const response = {
      id: credential.id,
      rawId: bufferEncode(credential.rawId),
      type: credential.type,
      response: {
        attestationObject: bufferEncode(attestation.attestationObject),
        clientDataJSON: bufferEncode(attestation.clientDataJSON),
        transports: attestation.getTransports ? attestation.getTransports() : []
      }
    };
    
    const resFinish = await fetch("/api/auth/passkey/register/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tsap-Token": token },
      body: JSON.stringify({ tsap_id: tsapId, password, challenge_id, response })
    });
    
    if (resFinish.status !== 200) return unconfirmed;
    const data: unknown = await resFinish.json();
    if (!confirmedAuthAck(data) || data.error || data.detail) return unconfirmed;
    return { success: true, message: typeof data.message_telugu === "string" ? data.message_telugu : undefined };
  } catch (e: any) {
    console.error("Passkey reg error:", e);
    return { success: false, message: e.message || "Passkey registration failed" };
  }
}

export async function loginPasskey(): Promise<{ success: boolean; tsap_id?: string; auth_token?: string; message?: string; unconfirmed?: boolean }> {
  try {
    const resBegin = await fetch("/api/auth/passkey/login/begin", {
      method: "POST"
    });
    if (resBegin.status !== 200) return { success: false, unconfirmed: true };
    const begin: unknown = await resBegin.json();
    if (!confirmedAuthAck(begin) || typeof begin.challenge_id !== "string" || !begin.challenge_id.trim() ||
        !begin.options || typeof begin.options !== "object" || Array.isArray(begin.options)) {
      return { success: false, unconfirmed: true };
    }
    const { options: encoded, challenge_id } = begin as {
      options: Omit<PublicKeyCredentialRequestOptions, "challenge" | "allowCredentials"> & {
        challenge: string;
        allowCredentials?: (Omit<PublicKeyCredentialDescriptor, "id"> & { id: string })[];
      };
      challenge_id: string;
    };
    if (typeof encoded.challenge !== "string" || !encoded.challenge) return { success: false, unconfirmed: true };
    const options: PublicKeyCredentialRequestOptions = {
      ...encoded,
      challenge: bufferDecode(encoded.challenge),
      allowCredentials: encoded.allowCredentials?.map(c => ({ ...c, id: bufferDecode(c.id) })),
    };
    
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
    
    if (resFinish.status !== 200) return { success: false, unconfirmed: true };
    const data: unknown = await resFinish.json();
    if (!confirmedAuthSession(data)) return { success: false, unconfirmed: true };
    return {
      success: true,
      tsap_id: data.tsap_id,
      auth_token: data.auth_token,
      message: typeof data.message_telugu === "string" ? data.message_telugu : typeof data.detail === "string" ? data.detail : undefined
    };
  } catch (e: any) {
    console.error("Passkey login error:", e);
    return { success: false, message: e.message || "Passkey login failed" };
  }
}
