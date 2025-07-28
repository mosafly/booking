import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/contexts/Auth';
import { useSupabase } from '../../lib/contexts/Supabase';
import { CoachProfile, GymBooking, CoachDashboardStats } from '../../types/coach';
import { format, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Calendar, Clock, Users, DollarSign, Plus, Edit, Trash2 } from 'lucide-react';
import { CreateBookingModal } from '../../components/coach/CreateBookingModal';
import { CoachProfileModal } from '../../components/coach/CoachProfileModal';
import { GlobalSchedule } from '../../components/schedule/GlobalSchedule';

export const CoachDashboard: React.FC = () => {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [bookings, setBookings] = useState<GymBooking[]>([]);
  const [stats, setStats] = useState<CoachDashboardStats>({
    total_classes: 0,
    upcoming_classes: 0,
    total_participants: 0,
    total_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadCoachData();
    }
  }, [user]);

  const loadCoachData = async () => {
    try {
      setLoading(true);
      
      // Load coach profile
      const { data: profileData, error: profileError } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        setCoachProfile(profileData);
        await loadBookings(profileData.id);
      }
    } catch (error) {
      console.error('Error loading coach data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async (coachId: string) => {
    try {
      const { data: bookingsData, error } = await supabase
        .from('gym_bookings')
        .select(`
          *,
          coach:coach_profiles!coach_id(*)
        `)
        .eq('coach_id', coachId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setBookings(bookingsData || []);
      calculateStats(bookingsData || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Erreur lors du chargement des réservations');
    }
  };

  const calculateStats = (bookings: GymBooking[]) => {
    const now = new Date();
    const upcoming = bookings.filter(b => isAfter(new Date(b.start_time), now));
    
    const stats: CoachDashboardStats = {
      total_classes: bookings.length,
      upcoming_classes: upcoming.length,
      total_participants: bookings.reduce((sum, b) => sum + b.current_participants, 0),
      total_revenue: bookings.reduce((sum, b) => sum + (b.price_cents * b.current_participants), 0) / 100,
    };

    setStats(stats);
  };

  const handleCreateBooking = async (bookingData: any) => {
    if (!coachProfile) return;

    try {
      const formattedData = {
        coach_id: coachProfile.id,
        title: bookingData.title,
        description: bookingData.description || '',
        class_type: bookingData.class_type || coachProfile.coach_type,
        start_time: new Date(bookingData.start_time).toISOString(),
        end_time: new Date(bookingData.end_time).toISOString(),
        max_participants: bookingData.max_participants || 10,
        price_cents: bookingData.price_cents || 0,
      };

      console.log('Creating booking with data:', formattedData);

      const { error } = await supabase
        .from('gym_bookings')
        .insert(formattedData);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success('Cours créé avec succès!');
      setShowCreateModal(false);
      loadBookings(coachProfile.id);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('gym_bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Cours supprimé');
      coachProfile && loadBookings(coachProfile.id);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCreateProfile = async (profileData: any) => {
    try {
      const { data, error } = await supabase
        .from('coach_profiles')
        .insert({
          user_id: user?.id,
          ...profileData,
        })
        .select()
        .single();

      if (error) throw error;

      setCoachProfile(data);
      toast.success('Profil coach créé avec succès!');
      setShowProfileModal(false);
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Erreur lors de la création du profil');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!coachProfile) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Devenir Coach
            </h1>
            <p className="text-gray-600 mb-8">
              Créez votre profil coach pour commencer à organiser des cours
            </p>
            <button
              onClick={() => setShowProfileModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer mon profil coach
            </button>
          </div>
        </div>

        <CoachProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onSave={handleCreateProfile}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard Coach
              </h1>
              <p className="text-gray-600 mt-1">
                {coachProfile.first_name} {coachProfile.last_name} - {coachProfile.coach_type}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowProfileModal(true)}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4 inline mr-2" />
                Modifier profil
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Nouveau cours
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total cours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_classes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Prochains cours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcoming_classes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Participants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_participants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenu total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_revenue}€</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Mes cours</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun cours programmé</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{booking.title}</h3>
                    <p className="text-sm text-gray-500">{booking.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(booking.start_time), 'dd MMM yyyy', { locale: fr })}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {format(new Date(booking.start_time), 'HH:mm', { locale: fr })} -
                        {format(new Date(booking.end_time), 'HH:mm', { locale: fr })}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {booking.current_participants}/{booking.max_participants}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBooking(booking.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Planning Global */}
        <div className="mt-8">
          <GlobalSchedule 
            viewMode="coach" 
            coachId={coachProfile?.id} 
          />
        </div>

      </div>

      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateBooking}
        coachType={coachProfile.coach_type}
      />

      <CoachProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleCreateProfile}
        initialData={coachProfile}
      />
    </div>
  );
};
