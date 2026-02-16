const apiEndpointInput = document.getElementById("apiEndpoint");
const modelInput = document.getElementById("model");
const apiKeyInput = document.getElementById("apiKey");
const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const previewFrame = document.getElementById("previewFrame");
const openNewTabBtn = document.getElementById("openNewTab");
const downloadBtn = document.getElementById("downloadBtn");

let latestHtml = "";

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", isError);
}

function extractCodeBlocks(text) {
    const htmlMatch = text.match(/```html\s*([\s\S]*?)```/i);
    const cssMatch = text.match(/```css\s*([\s\S]*?)```/i);
    const jsMatch = text.match(/```(?:javascript|js)\s*([\s\S]*?)```/i);

    if (!htmlMatch) {
        return null;
    }

    return {
        html: htmlMatch[1].trim(),
        css: cssMatch ? cssMatch[1].trim() : "",
        js: jsMatch ? jsMatch[1].trim() : ""
    };
}

function parseResponse(content) {
    try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed.html === "string") {
            return {
                html: parsed.html,
                css: typeof parsed.css === "string" ? parsed.css : "",
                js: typeof parsed.js === "string" ? parsed.js : ""
            };
        }
    } catch (error) {
        // Fall back to fenced code block parsing.
    }

    const blocks = extractCodeBlocks(content);
    if (blocks) {
        return blocks;
    }

    return {
        html: content,
        css: "",
        js: ""
    };
}

function composeDocument({ html, css, js }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
}


function buildHtmlBlobUrl() {
    const blob = new Blob([latestHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
}

async function generateWebsite() {
    const endpoint = apiEndpointInput.value.trim();
    const model = modelInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const prompt = promptInput.value.trim();

    if (!endpoint || !model || !apiKey || !prompt) {
        setStatus("Please fill endpoint, model, API key, and prompt.", true);
        return;
    }

    generateBtn.disabled = true;
    setStatus("Generating website...");

    const systemPrompt = `You are a website generator.
Return ONLY valid JSON with this exact schema:
{
  "html": "...",
  "css": "...",
  "js": "..."
}
Rules:
- html should include only body content (no html/head/body tags)
- css should style the page beautifully and responsively
- js should be optional but valid if present
- no markdown formatting and no explanation text.`;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("No content returned from API.");
        }

        const code = parseResponse(content);
        latestHtml = composeDocument(code);
        previewFrame.srcdoc = latestHtml;
        setStatus("Website generated successfully.");
    } catch (error) {
        setStatus(error.message || "Failed to generate website.", true);
    } finally {
        generateBtn.disabled = false;
    }
}

generateBtn.addEventListener("click", generateWebsite);

openNewTabBtn.addEventListener("click", () => {
    if (!latestHtml) {
        setStatus("Generate a website first.", true);
        return;
    }

    const url = buildHtmlBlobUrl();
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

downloadBtn.addEventListener("click", () => {
    if (!latestHtml) {
        setStatus("Generate a website first.", true);
        return;
    }

    const url = buildHtmlBlobUrl();
    const link = document.createElement("a");
    link.href = url;
    link.download = "generated-website.html";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Downloaded generated-website.html");
});

previewFrame.srcdoc = `<!doctype html>
<html>
  <body style="font-family: sans-serif; display:grid; place-items:center; height:100vh; margin:0; color:#334155;">
    <div>Preview will appear here after generation.</div>
  </body>
</html>`;
