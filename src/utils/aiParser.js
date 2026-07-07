const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

function extractJsonText(text) {
  if (!text) throw new Error('Không có kết quả từ AI');

  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;

  if (raw.startsWith('{') || raw.startsWith('[')) return raw;

  const firstObject = raw.indexOf('{');
  const firstArray = raw.indexOf('[');
  const starts = [firstObject, firstArray].filter(index => index >= 0);
  if (starts.length === 0) throw new Error('AI không trả về JSON hợp lệ');

  const start = Math.min(...starts);
  const opener = raw[start];
  const closer = opener === '{' ? '}' : ']';
  const end = raw.lastIndexOf(closer);
  if (end <= start) throw new Error('AI không trả về JSON đầy đủ');

  return raw.slice(start, end + 1);
}

function parseGeminiJson(text) {
  return JSON.parse(extractJsonText(text));
}

function normalizeGeminiError(errorPayload, fallback = 'Lỗi khi gọi Gemini') {
  const message = errorPayload?.error?.message || fallback;
  if (/API key not valid|API_KEY_INVALID/i.test(message)) {
    return 'Gemini API Key không hợp lệ. Vui lòng kiểm tra lại key.';
  }
  if (/quota|rate limit|RESOURCE_EXHAUSTED/i.test(message)) {
    return 'Gemini đang hết quota hoặc bị giới hạn lượt gọi. Vui lòng thử lại sau.';
  }
  if (/permission|PERMISSION_DENIED/i.test(message)) {
    return 'Gemini API Key chưa có quyền dùng model này.';
  }
  return message;
}

export async function callGeminiJson(prompt, apiKey, options = {}) {
  if (!apiKey?.trim()) {
    throw new Error('Vui lòng nhập Gemini API Key.');
  }

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: options.temperature ?? 0.1
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        lastError = new Error(normalizeGeminiError(errData, `Lỗi kết nối Gemini (${model})`));

        if ([400, 403, 404].includes(response.status)) continue;
        throw lastError;
      }

      const data = await response.json();
      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return parseGeminiJson(jsonText);
    } catch (error) {
      lastError = error;
      if (error instanceof SyntaxError) {
        throw new Error('AI trả về dữ liệu không đúng định dạng JSON. Vui lòng thử lại với văn bản rõ hơn.');
      }
    }
  }

  throw lastError || new Error('Không thể kết nối Gemini. Vui lòng thử lại.');
}

/**
 * Parses raw text into freelancer data using Google Gemini API.
 * @param {string} text Raw text input from user
 * @param {string} apiKey Gemini API Key
 */
export async function parseTextWithAI(text, apiKey) {
  const prompt = `Bạn là trợ lý AI chuyên nghiệp. Hãy phân tích đoạn văn bản sau và trích xuất thông tin của tất cả freelancer được nhắc tới.

Chỉ trả về JSON array thuần túy, không markdown, không giải thích.
Nếu thiếu thông tin, dùng chuỗi rỗng "".
Trường "bankAccountName" viết HOA KHÔNG DẤU.
Trường "birthDate" và "cccdDate" dùng định dạng YYYY-MM-DD nếu xác định được.
Trường "role" chỉ được là một trong: "coder", "voice_off", "camop", "other".

Mẫu JSON:
[
  {
    "fullName": "Nguyễn Văn A",
    "birthDate": "1999-01-01",
    "phone": "0900000000",
    "address": "",
    "cccd": "",
    "cccdDate": "",
    "cccdPlace": "",
    "bankAccountName": "NGUYEN VAN A",
    "bankAccountNumber": "",
    "bankName": "",
    "email": "",
    "role": "other",
    "notes": ""
  }
]

Văn bản cần phân tích:
---
${text}
---`;

  const result = await callGeminiJson(prompt, apiKey);
  const rows = Array.isArray(result) ? result : [result];

  return rows.map(f => ({
    fullName: f.fullName || '',
    birthDate: f.birthDate || '',
    address: f.address || '',
    phone: f.phone || '',
    cccd: f.cccd || '',
    cccdDate: f.cccdDate || '',
    cccdPlace: f.cccdPlace || '',
    bankAccountName: (f.bankAccountName || '').toUpperCase(),
    bankAccountNumber: f.bankAccountNumber || '',
    bankName: f.bankName || '',
    nationality: 'Việt Nam',
    email: f.email || '',
    role: ['coder', 'voice_off', 'camop', 'other'].includes(f.role) ? f.role : 'other',
    notes: f.notes || ''
  })).filter(f => f.fullName.trim());
}

export async function parseContractWithAI({ text, apiKey, freelancers, today }) {
  const freelancerNames = freelancers.map(f => `${f.fullName} (id: ${f.id})`).join(', ');

  const prompt = `Bạn là trợ lý phân tích hợp đồng tiếng Việt. Hãy phân tích văn bản hợp đồng sau và trả về JSON object thuần túy, không markdown, không giải thích.

Schema:
{
  "contractNumber": "Số hợp đồng hoặc chuỗi rỗng",
  "jobTitle": "Tên công việc/dịch vụ chính",
  "contractType": "Loại hợp đồng, mặc định Hợp đồng Cộng tác viên (không độc quyền)",
  "startDate": "YYYY-MM-DD hoặc chuỗi rỗng",
  "endDate": "YYYY-MM-DD hoặc chuỗi rỗng",
  "signDate": "YYYY-MM-DD, mặc định ${today}",
  "workLocation": "Nơi làm việc, mặc định tự do",
  "paymentMethod": "Phương thức thanh toán, mặc định Chuyển khoản",
  "taxRate": 10,
  "freelancerId": "id freelancer gần nhất từ danh sách nếu tên khớp, nếu không để rỗng. Danh sách: ${freelancerNames}",
  "items": [
    { "name": "Tên hạng mục", "unit": "Gói", "quantity": 1, "unitPrice": 0 }
  ],
  "paymentPhases": [
    { "phase": 1, "percentage": 50, "description": "Mô tả điều kiện giải ngân", "dueDate": "" }
  ]
}

Yêu cầu:
- Tất cả số tiền trả về dạng số, không có dấu chấm/phẩy.
- Nếu không thấy lịch thanh toán, trả 2 đợt 50/50.
- Tổng percentage của paymentPhases nên bằng 100.

Văn bản hợp đồng:
---
${text}
---`;

  const parsed = await callGeminiJson(prompt, apiKey);

  return {
    contractNumber: parsed.contractNumber || '',
    jobTitle: parsed.jobTitle || '',
    contractType: parsed.contractType || '',
    startDate: parsed.startDate || '',
    endDate: parsed.endDate || '',
    signDate: parsed.signDate || today,
    workLocation: parsed.workLocation || 'tự do',
    paymentMethod: parsed.paymentMethod || 'Chuyển khoản',
    taxRate: Number(parsed.taxRate) || 10,
    freelancerId: freelancers.some(f => f.id === parsed.freelancerId) ? parsed.freelancerId : '',
    items: Array.isArray(parsed.items) ? parsed.items : [],
    paymentPhases: Array.isArray(parsed.paymentPhases) ? parsed.paymentPhases : []
  };
}
