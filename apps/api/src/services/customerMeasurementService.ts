import { prisma } from '../db.js';

export interface MeasurementValueInput {
  field_id: string;
  numeric_value?: number | null;
  text_value?: string | null;
  unit?: 'in' | 'cm';
  notes?: string | null;
}

export interface CreateProfileInput {
  template_id: string;
  profile_name: string;
  notes?: string | null;
  measured_by?: string | null;
  measured_at?: string | Date;
  values: MeasurementValueInput[];
}

export interface AddVersionInput {
  notes?: string | null;
  measured_by?: string | null;
  measured_at?: string | Date;
  values: MeasurementValueInput[];
}

export class CustomerMeasurementService {
  static async getProfilesByCustomer(customerId: string) {
    const profiles = await prisma.customerMeasurementProfile.findMany({
      where: {
        customer_id: customerId,
        is_active: true,
      },
      include: {
        template: {
          include: {
            fields: {
              where: { is_active: true },
              orderBy: { display_order: 'asc' },
            },
          },
        },
        versions: {
          where: { is_current: true },
          include: {
            values: {
              include: {
                field: true,
              },
            },
          },
          take: 1,
        },
        _count: {
          select: { versions: true },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return profiles.map((p) => {
      const currentVer = p.versions[0] || null;
      return {
        id: p.id,
        customer_id: p.customer_id,
        template_id: p.template_id,
        template_name: p.template?.name || 'Garment Template',
        template_code: p.template?.code || 'CUSTOM',
        profile_name: p.profile_name,
        notes: p.notes,
        is_active: p.is_active,
        total_versions: p._count.versions,
        created_at: p.created_at.toISOString(),
        updated_at: p.updated_at.toISOString(),
        template_fields: p.template?.fields || [],
        current_version: currentVer
          ? {
              id: currentVer.id,
              profile_id: currentVer.profile_id,
              version_number: currentVer.version_number,
              measured_at: currentVer.measured_at.toISOString(),
              measured_by: currentVer.measured_by,
              notes: currentVer.notes,
              is_current: currentVer.is_current,
              created_at: currentVer.created_at.toISOString(),
              values: currentVer.values.map((v) => ({
                id: v.id,
                field_id: v.field_id,
                field_key: v.field?.field_key,
                field_name: v.field?.field_name,
                field_type: v.field?.field_type || 'number',
                numeric_value: v.numeric_value ? Number(v.numeric_value) : null,
                text_value: v.text_value,
                unit: v.unit || 'in',
                notes: v.notes,
              })),
            }
          : null,
      };
    });
  }

  static async getProfileDetails(customerId: string, profileId: string) {
    const profile = await prisma.customerMeasurementProfile.findFirst({
      where: {
        id: profileId,
        customer_id: customerId,
        is_active: true,
      },
      include: {
        template: {
          include: {
            fields: {
              where: { is_active: true },
              orderBy: { display_order: 'asc' },
            },
          },
        },
        versions: {
          where: { is_current: true },
          include: {
            values: {
              include: { field: true },
            },
          },
          take: 1,
        },
        _count: {
          select: { versions: true },
        },
      },
    });

    if (!profile) return null;

    const currentVer = profile.versions[0] || null;
    return {
      id: profile.id,
      customer_id: profile.customer_id,
      template_id: profile.template_id,
      template_name: profile.template?.name,
      template_code: profile.template?.code,
      profile_name: profile.profile_name,
      notes: profile.notes,
      total_versions: profile._count.versions,
      created_at: profile.created_at.toISOString(),
      updated_at: profile.updated_at.toISOString(),
      template_fields: profile.template?.fields || [],
      current_version: currentVer
        ? {
            id: currentVer.id,
            profile_id: currentVer.profile_id,
            version_number: currentVer.version_number,
            measured_at: currentVer.measured_at.toISOString(),
            measured_by: currentVer.measured_by,
            notes: currentVer.notes,
            is_current: currentVer.is_current,
            values: currentVer.values.map((v) => ({
              id: v.id,
              field_id: v.field_id,
              field_key: v.field?.field_key,
              field_name: v.field?.field_name,
              numeric_value: v.numeric_value ? Number(v.numeric_value) : null,
              text_value: v.text_value,
              unit: v.unit,
              notes: v.notes,
            })),
          }
        : null,
    };
  }

  static async getProfileHistory(customerId: string, profileId: string) {
    const profile = await prisma.customerMeasurementProfile.findFirst({
      where: {
        id: profileId,
        customer_id: customerId,
      },
      include: {
        template: true,
        versions: {
          orderBy: { version_number: 'desc' },
          include: {
            values: {
              include: { field: true },
            },
          },
        },
      },
    });

    if (!profile) return null;

    return {
      profile_id: profile.id,
      profile_name: profile.profile_name,
      template_name: profile.template?.name,
      customer_id: profile.customer_id,
      versions: profile.versions.map((v) => ({
        id: v.id,
        version_number: v.version_number,
        measured_at: v.measured_at.toISOString(),
        measured_by: v.measured_by,
        notes: v.notes,
        is_current: v.is_current,
        created_at: v.created_at.toISOString(),
        values: v.values.map((val) => ({
          id: val.id,
          field_id: val.field_id,
          field_key: val.field?.field_key,
          field_name: val.field?.field_name,
          numeric_value: val.numeric_value ? Number(val.numeric_value) : null,
          text_value: val.text_value,
          unit: val.unit,
          notes: val.notes,
        })),
      })),
    };
  }

  static async createProfile(customerId: string, input: CreateProfileInput) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error('Customer not found');

    const template = await prisma.measurementTemplate.findUnique({
      where: { id: input.template_id },
      include: { fields: true },
    });
    if (!template) throw new Error('Measurement template not found');

    const measuredDate = input.measured_at ? new Date(input.measured_at) : new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Create Profile
      const profile = await tx.customerMeasurementProfile.create({
        data: {
          customer_id: customerId,
          template_id: input.template_id,
          profile_name: input.profile_name.trim() || template.name,
          notes: input.notes || null,
          is_active: true,
        },
      });

      // 2. Create Initial Version (v1)
      const version = await tx.customerMeasurementVersion.create({
        data: {
          profile_id: profile.id,
          version_number: 1,
          measured_at: measuredDate,
          measured_by: input.measured_by || null,
          notes: input.notes || null,
          is_current: true,
        },
      });

      // 3. Insert Measurement Values
      if (input.values && input.values.length > 0) {
        await tx.customerMeasurementValue.createMany({
          data: input.values.map((v) => ({
            version_id: version.id,
            field_id: v.field_id,
            numeric_value: v.numeric_value !== undefined && v.numeric_value !== null ? v.numeric_value : null,
            text_value: v.text_value || null,
            unit: v.unit || 'in',
            notes: v.notes || null,
          })),
        });
      }

      return profile;
    });
  }

  static async addProfileVersion(customerId: string, profileId: string, input: AddVersionInput) {
    const profile = await prisma.customerMeasurementProfile.findFirst({
      where: { id: profileId, customer_id: customerId },
      include: { versions: { orderBy: { version_number: 'desc' }, take: 1 } },
    });
    if (!profile) throw new Error('Customer measurement profile not found');

    const nextVerNumber = (profile.versions[0]?.version_number || 0) + 1;
    const measuredDate = input.measured_at ? new Date(input.measured_at) : new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Mark existing versions as not current
      await tx.customerMeasurementVersion.updateMany({
        where: { profile_id: profileId, is_current: true },
        data: { is_current: false },
      });

      // 2. Create new version
      const newVersion = await tx.customerMeasurementVersion.create({
        data: {
          profile_id: profileId,
          version_number: nextVerNumber,
          measured_at: measuredDate,
          measured_by: input.measured_by || null,
          notes: input.notes || null,
          is_current: true,
        },
      });

      // 3. Save new values
      if (input.values && input.values.length > 0) {
        await tx.customerMeasurementValue.createMany({
          data: input.values.map((v) => ({
            version_id: newVersion.id,
            field_id: v.field_id,
            numeric_value: v.numeric_value !== undefined && v.numeric_value !== null ? v.numeric_value : null,
            text_value: v.text_value || null,
            unit: v.unit || 'in',
            notes: v.notes || null,
          })),
        });
      }

      // 4. Update profile updated_at timestamp
      await tx.customerMeasurementProfile.update({
        where: { id: profileId },
        data: { updated_at: new Date() },
      });

      return newVersion;
    });
  }

  static async updateProfile(customerId: string, profileId: string, data: { profile_name?: string; notes?: string }) {
    return prisma.customerMeasurementProfile.update({
      where: { id: profileId, customer_id: customerId },
      data: {
        ...(data.profile_name ? { profile_name: data.profile_name.trim() } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  static async deleteProfile(customerId: string, profileId: string) {
    return prisma.customerMeasurementProfile.update({
      where: { id: profileId, customer_id: customerId },
      data: { is_active: false },
    });
  }
}
