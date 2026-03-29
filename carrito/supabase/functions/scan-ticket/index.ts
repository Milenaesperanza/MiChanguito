import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // La TABSCANNER_API_KEY vive en Supabase → Settings → Edge Functions → Secrets
    // Nunca aparece en el frontend
    const TABSCANNER_KEY = Deno.env.get("TABSCANNER_API_KEY");
    if (!TABSCANNER_KEY) {
      throw new Error("TABSCANNER_API_KEY no configurada en Supabase Secrets");
    }

    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Se requiere imageBase64" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 1. Subir imagen a Tabscanner
    const uploadForm = new FormData();
    const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([imageBytes], { type: mimeType ?? "image/jpeg" });
    uploadForm.append("file", blob, "ticket.jpg");
    uploadForm.append("token", TABSCANNER_KEY);
    uploadForm.append("language", "spa"); // español

    const uploadRes = await fetch("https://api.tabscanner.com/api/2/process", {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      throw new Error(`Tabscanner upload error: ${uploadRes.status}`);
    }

    const uploadData = await uploadRes.json();
    const token = uploadData.token;

    if (!token) {
      throw new Error("Tabscanner no devolvió token de procesamiento");
    }

    // 2. Polling hasta tener resultado (máx 10 intentos, cada 1.5s)
    let result = null;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1500));

      const resultRes = await fetch(
        `https://api.tabscanner.com/api/result/${token}`,
        {
          headers: { Authorization: TABSCANNER_KEY },
        }
      );

      if (!resultRes.ok) continue;

      const data = await resultRes.json();

      if (data.status === "done" || data.status === "success") {
        result = data;
        break;
      }

      if (data.status === "failed") {
        throw new Error("Tabscanner no pudo procesar la imagen");
      }
    }

    if (!result) {
      throw new Error("Timeout: el ticket tardó demasiado en procesarse");
    }

    // 3. Normalizar respuesta: extraer lineItems con nombre y precio
    const lineItems = (result.document?.lineItems ?? []).map((item: any) => ({
      name: item.descClean ?? item.desc ?? "Producto sin nombre",
      price: parseFloat(item.lineTotal ?? item.unitPrice ?? "0") || 0,
    }));

    const totalAmount =
      parseFloat(result.document?.totalAmount ?? "0") || 0;

    const storeName =
      result.document?.establishment?.name ?? "";

    const receiptDate =
      result.document?.date ?? "";

    return new Response(
      JSON.stringify({ lineItems, totalAmount, storeName, receiptDate }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Error interno" }),
      {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      }
    );
  }
});
