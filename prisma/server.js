const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Documentação Swagger/OpenAPI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- ENDPOINTS REST ---

// POST /api/profiles
app.post('/api/profiles', async (req, res, next) => {
  try {
    const { name, email, bio } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: '400 Bad Request: Nome e email são obrigatórios.' });
    }
    const profile = await prisma.profile.create({ data: { name, email, bio } });
    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects com filtragem por tecnologia e paginação
app.get('/api/projects', async (req, res, next) => {
  try {
    const { tech, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = tech ? {
      technologies: { some: { name: { contains: String(tech) } } }
    } : {};

    const projects = await prisma.project.findMany({
      where,
      take: Number(limit),
      skip: skip,
      include: { profile: true, technologies: true, feedbacks: true }
    });

    res.json({ page: Number(page), limit: Number(limit), data: projects });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/feedbacks (Cadastrar nota de 1 a 5 e recalcular média)
app.post('/api/projects/:id/feedbacks', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5 || !comment) {
      return res.status(400).json({ error: '400 Bad Request: A nota deve ser entre 1 e 5 e o comentário é obrigatório.' });
    }

    const projectExists = await prisma.project.findUnique({ where: { id: Number(id) } });
    if (!projectExists) {
      return res.status(404).json({ error: '404 Not Found: Projeto não encontrado.' });
    }

    await prisma.feedback.create({
      data: { rating: Number(rating), comment, projectId: Number(id) }
    });

    // Recalcular nota média
    const feedbacks = await prisma.feedback.findMany({ where: { projectId: Number(id) } });
    const totalRating = feedbacks.reduce((acc, item) => acc + item.rating, 0);
    const average = totalRating / feedbacks.length;

    const updatedProject = await prisma.project.update({
      where: { id: Number(id) },
      data: { averageRating: average }
    });

    res.status(201).json({ message: 'Feedback adicionado com sucesso', project: updatedProject });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id/upvote (Incrementar curtidas/estrelas)
app.put('/api/projects/:id/upvote', async (req, res, next) => {
  try {
    const { id } = req.params;

    const projectExists = await prisma.project.findUnique({ where: { id: Number(id) } });
    if (!projectExists) {
      return res.status(404).json({ error: '404 Not Found: Projeto não encontrado.' });
    }

    const updatedProject = await prisma.project.update({
      where: { id: Number(id) },
      data: { upvotes: { increment: 1 } }
    });

    res.json(updatedProject);
  } catch (error) {
    next(error);
  }
});

// --- MANIPULADOR GLOBAL DE ERROS ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '500 Internal Server Error',
    message: err.message || 'Ocorreu um erro interno no servidor.'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(Servidor a rodar na porta ${PORT}));
