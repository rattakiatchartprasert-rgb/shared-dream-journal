// index.js (ฉบับ MongoDB)

const express = require('express');
const fs = require('fs'); // (เรายังเก็บ fs ไว้เผื่ออย่างอื่น แต่ไม่ใช้กับ dream แล้ว)
const path = require('path');
const app = express();
const cors = require('cors');

// --- 1. (เพิ่มใหม่) ---
const mongoose = require('mongoose');

// --- 2. (แทนที่ dataFile) ---
// (!!! สำคัญ !!!)
// วาง Connection String ของคุณตรงนี้!
// อย่าลืมแก้ <username> และ <password> ให้เป็นของคุณ
const MONGO_URI = "mongodb+srv://dreamUser:fBDS8PXBpJY3944k@cluster0.t7remom.mongodb.net/?appName=Cluster0";
// --------------------

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 3. (เพิ่มใหม่) การเชื่อมต่อ Mongoose ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas!'))
  .catch(error => {
    console.error('Error connecting to MongoDB Atlas:', error);
    process.exit(1); // ถ้าต่อ DB ไม่ได้ ก็ไม่ต้องรันเซิร์ฟเวอร์
  });

// --- 4. (เพิ่มใหม่) สร้าง "พิมพ์เขียว" (Schema) ---
// นี่คือการบอก Mongoose ว่า "Dream" 1 อัน มีหน้าตา/ข้อมูลอะไรบ้าง
const dreamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true // ตัดช่องว่างหน้า/หลัง
  },
  content: {
    type: String,
    required: true
  },
  // (Mongoose จะสร้าง timestamp ให้เราอัตโนมัติ!)
}, {
  // (สำคัญ) เพิ่ม field "createdAt" และ "updatedAt" ให้อัตโนมัติ
  timestamps: true 
});

// --- 5. (เพิ่มใหม่) สร้าง "โมเดล" (Model) ---
// นี่คือ "กล่อง" ที่ใช้ติดต่อกับ Collection "dreams" ใน DB
const Dream = mongoose.model('Dream', dreamSchema);


// --- (รื้อ API ใหม่ทั้งหมด โดยใช้ async/await) ---

// CREATE dream
app.post('/dreams', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content)
      return res.status(400).json({ error: 'Title and content are required' });

    // (เปลี่ยน) ใช้ Model สร้างและบันทึกในขั้นตอนเดียว
    const newDream = await Dream.create({
      title: title,
      content: content
    });

    res.status(201).json(newDream); // ส่งข้อมูลจาก DB กลับไป
  } catch (error) {
    console.error('Error POST /dreams:', error);
    res.status(500).json({ error: 'Server error creating dream' });
  }
});

// READ all dreams (search + sort + pagination)
app.get('/dreams', async (req, res) => {
  try {
    const { keyword, sort, page = 1, limit = 5 } = req.query; // (ใช้ limit = 5 จาก script.js)

    // 1. สร้าง Query เริ่มต้น (Filter)
    let query = {};
    if (keyword) {
      // (เปลี่ยน) ใช้ $regex ของ Mongo (เก่งกว่ามาก)
      // 'i' = case-insensitive (ไม่สนตัวเล็ก/ใหญ่)
      query = {
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { content: { $regex: keyword, $options: 'i' } }
        ]
      };
    }

    // 2. สร้าง Object สำหรับ Sort
    // (เปลี่ยน) ใช้ createdAt, updatedAt ที่ Mongoose สร้าง
    let sortOptions = {};
    if (sort === 'latest') {
      sortOptions = { updatedAt: -1 }; // -1 = Descending (ใหม่ไปเก่า)
    } else if (sort === 'oldest') {
      sortOptions = { updatedAt: 1 }; // 1 = Ascending (เก่าไปใหม่)
    } else {
      sortOptions = { updatedAt: -1 }; // Default คือใหม่สุด
    }

    // 3. คำนวณ Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 4. (ยิงคำสั่ง) ดึง Dreams และนับจำนวนทั้งหมด (ยิง 2 คำสั่งพร้อมกัน)
    const [dreams, total] = await Promise.all([
      Dream.find(query)    // 1. ค้นหา
           .sort(sortOptions) // 2. เรียงลำดับ
           .skip(skip)        // 3. ข้ามหน้า
           .limit(limitNum),  // 4. จำกัดจำนวน
      
      Dream.countDocuments(query) // 5. นับจำนวน (ที่ตรงกับคำค้น)
    ]);

    res.json({
      page: pageNum,
      limit: limitNum,
      total: total,
      dreams: dreams // ส่งข้อมูลจาก DB กลับไป
    });

  } catch (error) {
    console.error('Error GET /dreams:', error);
    res.status(500).json({ error: 'Server error getting dreams' });
  }
});

// READ one dream by id
app.get('/dreams/:id', async (req, res) => {
  try {
    // (เปลี่ยน) ใช้ findById (ง่ายกว่าเดิม)
    const dream = await Dream.findById(req.params.id);

    if (!dream) return res.status(404).json({ error: 'Dream not found' });
    res.json(dream);
  } catch (error) {
    // (สำคัญ) ถ้า ID หน้าตาแปลกๆ Mongoose จะ error ต้องดักไว้
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Dream not found (Invalid ID format)' });
    }
    console.error('Error GET /dreams/:id:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE dream
app.put('/dreams/:id', async (req, res) => {
  try {
    const { title, content } = req.body;

    // (เปลี่ยน) หาและอัปเดตในขั้นตอนเดียว
    // { new: true } = สั่งให้มันส่ง "ข้อมูลใหม่" กลับมา
    const updatedDream = await Dream.findByIdAndUpdate(
      req.params.id, 
      { title, content }, // (Mongoose จะอัปเดต 'updatedAt' ให้อัตโนมัติ)
      { new: true, runValidators: true }
    );

    if (!updatedDream) return res.status(404).json({ error: 'Dream not found' });
    res.json(updatedDream);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Dream not found (Invalid ID format)' });
    }
    console.error('Error PUT /dreams/:id:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE dream
app.delete('/dreams/:id', async (req, res) => {
  try {
    // (เปลี่ยน) หาและลบ
    const deletedDream = await Dream.findByIdAndDelete(req.params.id);

    if (!deletedDream) return res.status(404).json({ error: 'Dream not found' });
    res.json({ deleted: deletedDream });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Dream not found (Invalid ID format)' });
    }
    console.error('Error DELETE /dreams/:id:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// start server
const PORT = process.env.PORT || 3000; // (อัปเดตบรรทัดนี้)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // (อัปเดตบรรทัดนี้)
});