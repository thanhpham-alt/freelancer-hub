/**
 * Parses raw text into freelancer data using Google Gemini API.
 * @param {string} text Raw text input from user
 * @param {string} apiKey Gemini API Key
 */
export async function parseTextWithAI(text, apiKey) {
  if (!apiKey) {
    throw new Error('API Key is required');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `Bạn là trợ lý AI chuyên nghiệp. Hãy phân tích đoạn văn bản sau và trích xuất thông tin của tất cả các freelancer được nhắc tới. 
Nếu có trường thông tin nào không xuất hiện trong đoạn văn bản, hãy để giá trị là chuỗi rỗng "". 
Trường "bankAccountName" phải được chuyển thành viết hoa không dấu (Ví dụ: "PHAM DUY CUONG").
Trường "birthDate" và "cccdDate" nếu có hãy cố gắng chuyển sang định dạng YYYY-MM-DD.

Đoạn văn bản cần phân tích:
${text}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            fullName: { type: "STRING", description: "Họ và tên đầy đủ" },
            birthDate: { type: "STRING", description: "Ngày sinh định dạng YYYY-MM-DD hoặc rỗng" },
            phone: { type: "STRING", description: "Số điện thoại" },
            address: { type: "STRING", description: "Địa chỉ liên hệ" },
            cccd: { type: "STRING", description: "Số CCCD hoặc mã số thuế" },
            cccdDate: { type: "STRING", description: "Ngày cấp CCCD định dạng YYYY-MM-DD hoặc rỗng" },
            cccdPlace: { type: "STRING", description: "Nơi cấp CCCD" },
            bankAccountName: { type: "STRING", description: "Tên chủ tài khoản ngân hàng viết hoa không dấu" },
            bankAccountNumber: { type: "STRING", description: "Số tài khoản ngân hàng" },
            bankName: { type: "STRING", description: "Tên ngân hàng" },
            email: { type: "STRING", description: "Địa chỉ email" },
            role: { type: "STRING", description: "Vai trò/Chuyên môn của freelancer. Phải là một trong: 'coder', 'voice_off', 'camop', 'other'." },
            notes: { type: "STRING", description: "Ghi chú thêm về chuyên môn hoặc thông tin khác" }
          },
          required: ["fullName"]
        }
      }
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Failed to call Gemini API');
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!jsonText) {
      throw new Error('No content returned from Gemini');
    }

    const result = JSON.parse(jsonText);
    
    // Fallback normalization
    return result.map(f => ({
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
    }));

  } catch (error) {
    console.error('Error in parseTextWithAI:', error);
    throw error;
  }
}
