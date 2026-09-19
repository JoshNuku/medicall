const express = require('express');
const router = express.Router();
const { getTemplatesByCategory } = require('../db/queries/templates');

/**
 * @openapi
 * /instruction-templates:
 *   get:
 *     tags: [Instruction Templates]
 *     summary: Retrieve instruction templates
 *     description: Returns verified clinical instruction phrases in Twi filtered by category (dosage, frequency, timing) for dropdowns.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [dosage, frequency, timing]
 *         example: "dosage"
 *         description: Category filter for template phrases
 *     responses:
 *       200:
 *         description: List of instruction templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InstructionTemplate'
 */
router.get('/', (req, res, next) => {
  try {
    const { category } = req.query;
    const templates = getTemplatesByCategory(category);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
