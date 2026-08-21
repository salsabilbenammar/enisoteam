const express = require('express');
const logistiqueController = require('../controllers/logistiqueController');
const { requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', requireAdmin, logistiqueController.getAll);
router.post('/', requireAdmin, logistiqueController.create);

router.get('/emprunts', requireAdmin, logistiqueController.listEmprunts);
router.post('/emprunts', requireAdmin, logistiqueController.createEmprunt);
router.post('/emprunts/:id/retour', requireAdmin, logistiqueController.returnEmprunt);

router.get('/:id', requireAdmin, logistiqueController.getById);
router.put('/:id', requireAdmin, logistiqueController.update);
router.delete('/:id', requireAdmin, logistiqueController.remove);

module.exports = router;
