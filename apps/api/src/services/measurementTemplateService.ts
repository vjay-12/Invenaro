import { prisma } from '../db.js';

export interface DefaultFieldSpec {
  field_key: string;
  field_name: string;
  field_type: 'number' | 'text';
  default_unit: 'in' | 'cm';
  display_order: number;
  is_required: boolean;
}

export interface DefaultTemplateSpec {
  name: string;
  code: string;
  category: string;
  description: string;
  is_default: boolean;
  fields: DefaultFieldSpec[];
}

export const SOUTH_INDIAN_DEFAULT_TEMPLATES: DefaultTemplateSpec[] = [
  {
    name: 'Saree Blouse',
    code: 'SAREE_BLOUSE',
    category: 'WOMEN',
    description: 'Traditional & designer South Indian saree blouse tailoring template',
    is_default: true,
    fields: [
      { field_key: 'blouse_length', field_name: 'Blouse Length', field_type: 'number', default_unit: 'in', display_order: 1, is_required: true },
      { field_key: 'shoulder', field_name: 'Shoulder', field_type: 'number', default_unit: 'in', display_order: 2, is_required: true },
      { field_key: 'upper_bust', field_name: 'Upper Bust / Upper Chest', field_type: 'number', default_unit: 'in', display_order: 3, is_required: false },
      { field_key: 'bust', field_name: 'Bust', field_type: 'number', default_unit: 'in', display_order: 4, is_required: true },
      { field_key: 'under_bust', field_name: 'Under Bust', field_type: 'number', default_unit: 'in', display_order: 5, is_required: false },
      { field_key: 'waist', field_name: 'Waist', field_type: 'number', default_unit: 'in', display_order: 6, is_required: true },
      { field_key: 'armhole', field_name: 'Armhole', field_type: 'number', default_unit: 'in', display_order: 7, is_required: true },
      { field_key: 'bicep', field_name: 'Bicep', field_type: 'number', default_unit: 'in', display_order: 8, is_required: false },
      { field_key: 'sleeve_length', field_name: 'Sleeve Length', field_type: 'number', default_unit: 'in', display_order: 9, is_required: false },
      { field_key: 'sleeve_round', field_name: 'Sleeve Round', field_type: 'number', default_unit: 'in', display_order: 10, is_required: false },
      { field_key: 'wrist', field_name: 'Wrist', field_type: 'number', default_unit: 'in', display_order: 11, is_required: false },
      { field_key: 'front_neck_width', field_name: 'Front Neck Width', field_type: 'number', default_unit: 'in', display_order: 12, is_required: false },
      { field_key: 'front_neck_depth', field_name: 'Front Neck Depth', field_type: 'number', default_unit: 'in', display_order: 13, is_required: false },
      { field_key: 'back_neck_width', field_name: 'Back Neck Width', field_type: 'number', default_unit: 'in', display_order: 14, is_required: false },
      { field_key: 'back_neck_depth', field_name: 'Back Neck Depth', field_type: 'number', default_unit: 'in', display_order: 15, is_required: false },
      { field_key: 'apex_to_apex', field_name: 'Apex to Apex (Distance)', field_type: 'number', default_unit: 'in', display_order: 16, is_required: false },
      { field_key: 'shoulder_to_apex', field_name: 'Shoulder to Apex (Point)', field_type: 'number', default_unit: 'in', display_order: 17, is_required: false },
      { field_key: 'front_length', field_name: 'Front Length', field_type: 'number', default_unit: 'in', display_order: 18, is_required: false },
      { field_key: 'back_length', field_name: 'Back Length', field_type: 'number', default_unit: 'in', display_order: 19, is_required: false },
      { field_key: 'notes', field_name: 'Pattern / Hook / Back Dori Notes', field_type: 'text', default_unit: 'in', display_order: 20, is_required: false },
    ],
  },
  {
    name: 'Churidar / Salwar',
    code: 'CHURIDAR_SALWAR',
    category: 'WOMEN',
    description: 'Churidar, Salwar Kameez and Patiala suit tailoring template',
    is_default: true,
    fields: [
      { field_key: 'shoulder', field_name: 'Shoulder', field_type: 'number', default_unit: 'in', display_order: 1, is_required: true },
      { field_key: 'bust', field_name: 'Bust', field_type: 'number', default_unit: 'in', display_order: 2, is_required: true },
      { field_key: 'waist', field_name: 'Waist', field_type: 'number', default_unit: 'in', display_order: 3, is_required: true },
      { field_key: 'hip', field_name: 'Hip', field_type: 'number', default_unit: 'in', display_order: 4, is_required: true },
      { field_key: 'armhole', field_name: 'Armhole', field_type: 'number', default_unit: 'in', display_order: 5, is_required: true },
      { field_key: 'sleeve_length', field_name: 'Sleeve Length', field_type: 'number', default_unit: 'in', display_order: 6, is_required: false },
      { field_key: 'bicep', field_name: 'Bicep', field_type: 'number', default_unit: 'in', display_order: 7, is_required: false },
      { field_key: 'sleeve_round', field_name: 'Sleeve Round', field_type: 'number', default_unit: 'in', display_order: 8, is_required: false },
      { field_key: 'top_length', field_name: 'Top / Kurti Length', field_type: 'number', default_unit: 'in', display_order: 9, is_required: true },
      { field_key: 'pant_length', field_name: 'Pant / Salwar Length', field_type: 'number', default_unit: 'in', display_order: 10, is_required: true },
      { field_key: 'thigh', field_name: 'Thigh Round', field_type: 'number', default_unit: 'in', display_order: 11, is_required: false },
      { field_key: 'knee', field_name: 'Knee Round', field_type: 'number', default_unit: 'in', display_order: 12, is_required: false },
      { field_key: 'calf', field_name: 'Calf Round', field_type: 'number', default_unit: 'in', display_order: 13, is_required: false },
      { field_key: 'ankle', field_name: 'Ankle Round', field_type: 'number', default_unit: 'in', display_order: 14, is_required: false },
      { field_key: 'bottom_opening', field_name: 'Bottom Opening (Mori)', field_type: 'number', default_unit: 'in', display_order: 15, is_required: false },
      { field_key: 'neck_width', field_name: 'Neck Width', field_type: 'number', default_unit: 'in', display_order: 16, is_required: false },
      { field_key: 'front_neck_depth', field_name: 'Front Neck Depth', field_type: 'number', default_unit: 'in', display_order: 17, is_required: false },
      { field_key: 'back_neck_depth', field_name: 'Back Neck Depth', field_type: 'number', default_unit: 'in', display_order: 18, is_required: false },
      { field_key: 'notes', field_name: 'Fit & Styling Notes', field_type: 'text', default_unit: 'in', display_order: 19, is_required: false },
    ],
  },
  {
    name: 'Kurti',
    code: 'KURTI',
    category: 'WOMEN',
    description: 'Straight, A-line & Anarkali kurti tailoring template',
    is_default: true,
    fields: [
      { field_key: 'shoulder', field_name: 'Shoulder', field_type: 'number', default_unit: 'in', display_order: 1, is_required: true },
      { field_key: 'bust', field_name: 'Bust', field_type: 'number', default_unit: 'in', display_order: 2, is_required: true },
      { field_key: 'waist', field_name: 'Waist', field_type: 'number', default_unit: 'in', display_order: 3, is_required: true },
      { field_key: 'hip', field_name: 'Hip', field_type: 'number', default_unit: 'in', display_order: 4, is_required: true },
      { field_key: 'armhole', field_name: 'Armhole', field_type: 'number', default_unit: 'in', display_order: 5, is_required: true },
      { field_key: 'sleeve_length', field_name: 'Sleeve Length', field_type: 'number', default_unit: 'in', display_order: 6, is_required: false },
      { field_key: 'bicep', field_name: 'Bicep', field_type: 'number', default_unit: 'in', display_order: 7, is_required: false },
      { field_key: 'sleeve_round', field_name: 'Sleeve Round', field_type: 'number', default_unit: 'in', display_order: 8, is_required: false },
      { field_key: 'kurti_length', field_name: 'Kurti Length', field_type: 'number', default_unit: 'in', display_order: 9, is_required: true },
      { field_key: 'front_neck', field_name: 'Front Neck (Depth/Style)', field_type: 'number', default_unit: 'in', display_order: 10, is_required: false },
      { field_key: 'back_neck', field_name: 'Back Neck (Depth/Style)', field_type: 'number', default_unit: 'in', display_order: 11, is_required: false },
      { field_key: 'notes', field_name: 'Slit, Yoke & Neckline Notes', field_type: 'text', default_unit: 'in', display_order: 12, is_required: false },
    ],
  },
  {
    name: 'Pants / Bottom',
    code: 'PANTS_BOTTOM',
    category: 'WOMEN',
    description: 'Palazzo, cigarette pants, trousers and salwar bottom template',
    is_default: true,
    fields: [
      { field_key: 'waist', field_name: 'Waist', field_type: 'number', default_unit: 'in', display_order: 1, is_required: true },
      { field_key: 'hip', field_name: 'Hip', field_type: 'number', default_unit: 'in', display_order: 2, is_required: true },
      { field_key: 'rise', field_name: 'Rise (Crotch Depth)', field_type: 'number', default_unit: 'in', display_order: 3, is_required: false },
      { field_key: 'thigh', field_name: 'Thigh Round', field_type: 'number', default_unit: 'in', display_order: 4, is_required: false },
      { field_key: 'knee', field_name: 'Knee Round', field_type: 'number', default_unit: 'in', display_order: 5, is_required: false },
      { field_key: 'calf', field_name: 'Calf Round', field_type: 'number', default_unit: 'in', display_order: 6, is_required: false },
      { field_key: 'full_length', field_name: 'Full Length', field_type: 'number', default_unit: 'in', display_order: 7, is_required: true },
      { field_key: 'ankle', field_name: 'Ankle / Hem Opening', field_type: 'number', default_unit: 'in', display_order: 8, is_required: false },
      { field_key: 'bottom_opening', field_name: 'Bottom Opening Width', field_type: 'number', default_unit: 'in', display_order: 9, is_required: false },
      { field_key: 'notes', field_name: 'Elastic / Band / Pocket Notes', field_type: 'text', default_unit: 'in', display_order: 10, is_required: false },
    ],
  },
];

export class MeasurementTemplateService {
  /**
   * Ensures the South-Indian default templates exist in the database.
   * Runs idempotently (only creates missing templates).
   */
  static async ensureDefaultTemplates() {
    for (const spec of SOUTH_INDIAN_DEFAULT_TEMPLATES) {
      const existing = await prisma.measurementTemplate.findUnique({
        where: { code: spec.code },
        include: { fields: true },
      });

      if (!existing) {
        await prisma.measurementTemplate.create({
          data: {
            name: spec.name,
            code: spec.code,
            category: spec.category,
            description: spec.description,
            is_default: true,
            is_active: true,
            fields: {
              create: spec.fields.map((f) => ({
                field_key: f.field_key,
                field_name: f.field_name,
                field_type: f.field_type,
                default_unit: f.default_unit,
                display_order: f.display_order,
                is_required: f.is_required,
                is_active: true,
              })),
            },
          },
        });
      }
    }
  }

  static async getAllTemplates(category?: string) {
    await this.ensureDefaultTemplates();
    return prisma.measurementTemplate.findMany({
      where: {
        is_active: true,
        ...(category ? { category } : {}),
      },
      include: {
        fields: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' },
        },
      },
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  static async getTemplateById(id: string) {
    return prisma.measurementTemplate.findUnique({
      where: { id },
      include: {
        fields: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  static async createCustomTemplate(data: {
    name: string;
    description?: string | null;
    category?: string;
    fields?: Array<{
      field_key: string;
      field_name: string;
      field_type?: 'number' | 'text';
      default_unit?: 'in' | 'cm';
      display_order?: number;
      is_required?: boolean;
    }>;
  }) {
    const rawCode = data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);
    const code = `CUSTOM_${rawCode}_${Date.now().toString().slice(-4)}`;

    return prisma.measurementTemplate.create({
      data: {
        name: data.name,
        code,
        description: data.description || null,
        category: data.category || 'CUSTOM',
        is_default: false,
        is_active: true,
        fields: {
          create: (data.fields || []).map((f, index) => ({
            field_key: f.field_key || `field_${index + 1}`,
            field_name: f.field_name,
            field_type: f.field_type || 'number',
            default_unit: f.default_unit || 'in',
            display_order: f.display_order ?? (index + 1),
            is_required: Boolean(f.is_required),
            is_active: true,
          })),
        },
      },
      include: {
        fields: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  static async updateTemplate(id: string, data: {
    name?: string;
    description?: string | null;
    category?: string;
  }) {
    return prisma.measurementTemplate.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category ? { category: data.category } : {}),
      },
      include: {
        fields: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  static async addField(templateId: string, field: {
    field_key: string;
    field_name: string;
    field_type?: 'number' | 'text';
    default_unit?: 'in' | 'cm';
    display_order?: number;
    is_required?: boolean;
  }) {
    const template = await prisma.measurementTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('Template not found');

    const maxOrder = await prisma.measurementTemplateField.aggregate({
      where: { template_id: templateId },
      _max: { display_order: true },
    });

    return prisma.measurementTemplateField.create({
      data: {
        template_id: templateId,
        field_key: field.field_key,
        field_name: field.field_name,
        field_type: field.field_type || 'number',
        default_unit: field.default_unit || 'in',
        display_order: field.display_order ?? ((maxOrder._max.display_order || 0) + 1),
        is_required: Boolean(field.is_required),
        is_active: true,
      },
    });
  }

  static async updateField(templateId: string, fieldId: string, updates: {
    field_name?: string;
    field_type?: 'number' | 'text';
    default_unit?: 'in' | 'cm';
    display_order?: number;
    is_required?: boolean;
    is_active?: boolean;
  }) {
    return prisma.measurementTemplateField.update({
      where: {
        id: fieldId,
        template_id: templateId,
      },
      data: updates,
    });
  }

  static async removeField(templateId: string, fieldId: string) {
    // Soft disable to preserve historical references
    return prisma.measurementTemplateField.update({
      where: {
        id: fieldId,
        template_id: templateId,
      },
      data: { is_active: false },
    });
  }
}
