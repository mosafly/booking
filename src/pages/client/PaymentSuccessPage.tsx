import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PaymentSuccessPage: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const reservationId = searchParams.get('reservation_id');

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-md shadow-md text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">{t('paymentSuccessPage.title', 'Payment Successful!')}</h1>
            <p className="text-gray-600 mb-6">
                {t('paymentSuccessPage.message', 'Your payment has been processed successfully. Your reservation status will be updated shortly.')}
            </p>
            {reservationId && (
                <p className="text-sm text-gray-500 mb-6">
                    {t('paymentSuccessPage.reservationIdLabel', 'Reservation ID:')} {reservationId}
                </p>
            )}
            <Link
                to="/home/my-reservations"
                className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition duration-300"
            >
                {t('paymentSuccessPage.button', 'View My Reservations')}
            </Link>
        </div>
    );
};

export default PaymentSuccessPage; 