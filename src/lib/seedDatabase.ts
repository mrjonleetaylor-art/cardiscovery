import { supabase } from './supabase';
import { seedVehicles } from '../data/seedData';

export const seedDatabase = async () => {
  try {
    const { data: existingVehicles } = await supabase
      .from('vehicles')
      .select('id')
      .limit(1);

    if (existingVehicles && existingVehicles.length > 0) {
      console.log('Database already seeded');
      return { success: true, message: 'Database already seeded' };
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert(seedVehicles)
      .select();

    if (error) {
      console.error('Error seeding database:', error);
      return { success: false, error };
    }

    console.log('Database seeded successfully with', data?.length, 'vehicles');
    return { success: true, data };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, error };
  }
};
