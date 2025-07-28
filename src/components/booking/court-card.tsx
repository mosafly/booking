import React from "react";
import { useNavigate } from "react-router-dom";
import { Tag } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { formatFCFA } from "@/lib/utils/currency";
import { getCourtImage } from "@/lib/utils/court-images";

export type Court = {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
  image_url: string | null;
  status: "available" | "reserved" | "maintenance";
};

interface CourtCardProps {
  court: Court;
}

const CourtCard: React.FC<CourtCardProps> = ({ court }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBookNow = () => {
    navigate(`/home/reservation/${court.id}`);
  };

  const getStatusBadge = () => {
    switch (court.status) {
      case "available":
        return <span className="badge badge-success">{t('courtCard.statusAvailable')}</span>;
      case "reserved":
        return <span className="badge badge-accent">{t('courtCard.statusReserved')}</span>;
      case "maintenance":
        return <span className="badge badge-danger">{t('courtCard.statusMaintenance')}</span>;
      default:
        return null;
    }
  };

  // Handle null case for description
  const description = court.description || t('courtCard.noDescription');

  return (
    <div className="card animate-fade-in">
      <div className="relative h-48 w-full">
        <img
          src={court.image_url || getCourtImage(court.id, court.name)}
          alt={court.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to default image if local image fails to load
            const target = e.target as HTMLImageElement;
            target.src = "https://images.pexels.com/photos/2277807/pexels-photo-2277807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";
          }}
        />
        <div className="absolute top-2 right-2">{getStatusBadge()}</div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{court.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-700">
            <Tag size={16} className="mr-1" />
            <span>
              {formatFCFA(court.price_per_hour)} {t('courtCard.pricePerHourSuffix')}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleBookNow}
            disabled={court.status !== "available"}
            className={`w-full btn ${court.status === "available"
              ? "btn-primary"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
          >
            {court.status === "available" ? t('courtCard.bookNow') : t('courtCard.unavailable')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourtCard;
