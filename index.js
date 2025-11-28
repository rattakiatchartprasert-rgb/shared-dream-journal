// index.js (ฉบับ Vercel & Localhost - แก้ไขแล้ว)

const express = require('express');
const fs = require('fs'); 
const path = require('path');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');

// (!!! สำคัญ !!!) 
// แนะนำให้ใช้ Environment Variable ใน Vercel Settings จะปลอดภัยกว่า
// แต่ถ้าจะใส่ตรงนี้เลย ก็ใช้ได้ครับ (ระวังคนอื่นเห็นรหัสผ่าน)
const MONGO_URI = "mongodb+srv://dreamUser:fBDS8PXBpJY3944k@cluster0.t7remom.mongodb.net/?appName=Cluster0";

app.use(cors());
app.use(express.json());
// ใช้ path.join เพื่อให้หาโฟลเดอร์ public เจอแน่นอน
app.use(express.static(path.join(__dirname, 'public')));

// --- สร้าง Schema & Model ---
const dreamSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
}, { timestamps: true });

// (สำคัญ) เช็คว่ามี Model นี้อยู่แล้วหรือยัง (กัน Error เวลา Vercel เรียกซ้ำ)
const Dream = mongoose.models.Dream || mongoose.model('Dream', dreamSchema);

// --- การเชื่อมต่อ Database (แบบ Serverless) ---
// เราจะไม่ต่อทิ้งไว้ข้างบน แต่จะต่อเมื่อมีการเรียกใช้งาน (Middleware)
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return; // ถ้าต่ออยู่แล้ว ให้ผ่านไปเลย

  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    // ห้ามใช้ process.exit(1) บน Vercel
  }
};

// --- Middleware: สั่งให้ต่อ DB ทุกครั้งที่มีคนเข้าเว็บ ---
app.use(async (req, res, next) => {
  await connectDB();
  next();
});


// --- API Routes (เหมือนเดิม) ---

app.post('/dreams', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const newDream = await Dream.create({ title, content });
    res.status(201).json(newDream);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/dreams', async (req, res) => {
  try {
    const { keyword, sort, page = 1, limit = 5 } = req.query;
    let query = {};
    if (keyword) {
      query = {
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { content: { $regex: keyword, $options: 'i' } }
        ]
      };
    }
    let sortOptions = { updatedAt: -1 };
    if (sort === 'oldest') sortOptions = { updatedAt: 1 };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [dreams, total] = await Promise.all([
      Dream.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      Dream.countDocuments(query)
    ]);

    res.json({ page: pageNum, limit: limitNum, total, dreams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/dreams/:id', async (req, res) => {
  try {
    const dream = await Dream.findById(req.params.id);
    if (!dream) return res.status(404).json({ error: 'Dream not found' });
    res.json(dream);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/dreams/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const updatedDream = await Dream.findByIdAndUpdate(
      req.params.id, 
      { title, content }, 
      { new: true, runValidators: true }
    );
    if (!updatedDream) return res.status(404).json({ error: 'Dream not found' });
    res.json(updatedDream);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/dreams/:id', async (req, res) => {
  try {
    const deletedDream = await Dream.findByIdAndDelete(req.params.id);
    if (!deletedDream) return res.status(404).json({ error: 'Dream not found' });
    res.json({ deleted: deletedDream });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- ส่วนสำคัญสำหรับการ Deploy Vercel ---

// ถ้าไฟล์นี้ถูกรันโดยตรง (เช่น node index.js ในเครื่อง) ให้รัน app.listen
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

// ส่งออก app ให้ Vercel เอาไปใช้ (Serverless)
module.exports = app;