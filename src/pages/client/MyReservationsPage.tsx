import React, { useState, useEffect } from "react";
import { useSupabase } from "@/lib/contexts/Supabase";
import { useAuth } from "@/lib/contexts/Auth";
import ReservationList, {
  Reservation,
} from "@/components/booking/reservation-list";
import toast from "react-hot-toast";
import { Spinner } from "@/components/dashboard/spinner";
import { useTranslation } from "react-i18next";

const MyReservationsPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReservations = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("reservations")
          .select(
            `
            *,
            courts(name)
          `,
          )
          .eq("user_id", user.id)
          .order("start_time", { ascending: false });

        if (error) throw error;

        // Transform the data to match our Reservation type
        const transformedData = data.map((item) => ({
          ...item,
          court_name: item.courts.name,
        }));

        setReservations(transformedData);
      } catch (error) {
        console.error("Error fetching reservations:", error);
        toast.error(t("myReservationsPage.errorLoading"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, [user, supabase, t]);

  const handleCancelReservation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;

      // Update the local state
      setReservations((prev) =>
        prev.map((res) =>
          res.id === id ? { ...res, status: "cancelled" } : res,
        ),
      );

      toast.success(t("myReservationsPage.cancelSuccess"));
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      toast.error(t("myReservationsPage.cancelError"));
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t("myReservationsPage.title")}
        </h1>
        <p className="text-gray-600">
          {t("myReservationsPage.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <ReservationList
          reservations={reservations}
          onCancel={handleCancelReservation}
        />
      )}
    </div>
  );
};

export default MyReservationsPage;
