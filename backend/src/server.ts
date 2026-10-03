
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import path from "path";

const prisma = new PrismaClient();

const app = express();

const PORT = Number(process.env.PORT || 10000);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(cors());

app.use(
  express.json({
    limit: "1mb",
  })
);

const placeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.string().max(40).default("other"),
  icon: z.string().max(20).default("📍"),
  color: z.string().max(30).default("#2563eb"),
  description: z.string().max(2000).default(""),
  note: z.string().max(4000).default(""),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  favorite: z.boolean().default(false),
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "real-world-map",
    time: new Date().toISOString(),
  });
});

/* =========================
   GET PLACES
========================= */

app.get("/api/places", async (_req, res) => {
  try {
    const places = await prisma.place.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    res.json(places);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Không thể tải địa điểm.",
    });
  }
});

/* =========================
   CREATE PLACE
========================= */

app.post("/api/places", async (req, res) => {
  const parsed = placeSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Dữ liệu địa điểm không hợp lệ.",
      details: parsed.error.flatten(),
    });
  }

  try {
    const place = await prisma.place.create({
      data: parsed.data,
    });

    res.status(201).json(place);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Không thể tạo địa điểm.",
    });
  }
});

/* =========================
   UPDATE PLACE
========================= */

app.patch("/api/places/:id", async (req, res) => {
  const parsed = placeSchema.partial().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Dữ liệu cập nhật không hợp lệ.",
    });
  }

  try {
    const place = await prisma.place.update({
      where: {
        id: req.params.id,
      },
      data: parsed.data,
    });

    res.json(place);
  } catch (error) {
    console.error(error);

    res.status(404).json({
      error: "Địa điểm không tồn tại.",
    });
  }
});

/* =========================
   DELETE PLACE
========================= */

app.delete("/api/places/:id", async (req, res) => {
  try {
    await prisma.place.delete({
      where: {
        id: req.params.id,
      },
    });

    res.status(204).end();
  } catch (error) {
    console.error(error);

    res.status(404).json({
      error: "Địa điểm không tồn tại.",
    });
  }
});

/* =========================
   VIP VERIFY
========================= */

app.post("/api/vip/verify", (req, res) => {
  const code =
    typeof req.body?.code === "string"
      ? req.body.code
      : "";

  const expected = process.env.VIP_CODE || "";

  if (!expected) {
    return res.status(503).json({
      valid: false,
      error: "VIP chưa được cấu hình trên server.",
    });
  }

  res.json({
    valid: code === expected,
  });
});

/* =========================
   FRONTEND
========================= */

const frontendPath = path.resolve(
  process.cwd(),
  "../frontend/dist"
);

app.use(express.static(frontendPath));

app.get("/{*splat}", (_req, res) => {
  res.sendFile(
    path.join(frontendPath, "index.html")
  );
});

/* =========================
   START
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Real World Map running on port ${PORT}`);
});
