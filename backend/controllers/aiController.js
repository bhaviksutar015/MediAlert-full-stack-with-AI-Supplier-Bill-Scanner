const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const extractMedicineDetails = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // UPGRADE: We force Gemini into strict JSON mode here
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.6-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const imagePart = {
      inlineData: {
        data: fs.readFileSync(req.file.path).toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `
      Analyze this medicine packaging. Extract the following details:
      1. Medicine Name
      2. Batch Number
      3. Expiry Date
      
      Return a JSON object with EXACTLY these keys: "name", "batchNumber", "category", "expiryDate". 
      Make your best guess for the category based on the name.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    
    // Because of strict JSON mode, we no longer need complex string replacing
    const responseText = result.response.text();
    const extractedData = JSON.parse(responseText);

    // Delete temporary file on success
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error("AI Extraction Error:", error); // Check your terminal for this!
    
    // UPGRADE: Ensure the file gets deleted even if the AI crashes
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: "Failed to analyze image." });
  }
};

module.exports = { extractMedicineDetails };