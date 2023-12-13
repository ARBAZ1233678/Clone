import React, { useState, useEffect } from 'react';
import './Payment.css';
import { useStateValue } from './StateProvider';
import CheckoutProduct from './CheckoutProduct';
import { Link, useNavigate } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import CurrencyFormat from 'react-currency-format';
import { getBasketTotal } from './reducer';
import axios from './axios';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';



function Payment() {
  const [{ basket, user }, dispatch] = useStateValue();
  const history = useNavigate();

  const stripe = useStripe();
  const elements = useElements();

  const [succeeded, setSucceeded] = useState(false);
  const [processing, setProcessing] = useState('');
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(true);
  const [clientSecret, setClientSecret] = useState(true);

  useEffect(() => {
    // generate the special stripe secret which allows us to charge a customer
    const getClientSecret = async () => {
      const response = await axios({
        method: 'post',
        // Stripe expects the total in a currencies subunits
        url: `/payments/create?total=${getBasketTotal(basket) * 100}`,
      });
      setClientSecret(response.data.clientSecret);
    };

    getClientSecret();
  }, [basket]);

  console.log('THE SECRET IS >>>', clientSecret);
  console.log('👱', user);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
  
    try {
      const payload = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });
  
      if (payload.error) {
        throw new Error(payload.error.message);
      }
  
      if (!payload.paymentIntent || !payload.paymentIntent.id) {
        throw new Error('PaymentIntent ID is missing or undefined.');
      }
  
      const amount = payload.paymentIntent ? payload.paymentIntent.amount : 0;
      const created = payload.paymentIntent ? payload.paymentIntent.created : null;
  
      const firestore = getFirestore();
      const orderDocRef = doc(
        collection(
          firestore,
          'users',
          user?.uid,
          'orders'
        ),
        payload.paymentIntent.id
      );
  
      if (amount !== undefined && created !== undefined) {
        try {
          await setDoc(orderDocRef, {
            basket: basket,
            amount: amount,
            created: created,
          });
  
          setSucceeded(true);
          setError(null);
          setProcessing(false);
  
          dispatch({
            type: 'EMPTY_BASKET',
          });
  
          history.replace('/orders');
        } catch (error) {
          console.error('Error setting document:', error);
          setError('Error confirming payment. Please try again.');
          setProcessing(false);
        }
      } else {
        console.error('Amount or created is undefined.');
        setError('Error confirming payment. Please try again.');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      setError('Error confirming payment. Please try again.');
      setProcessing(false);
    }
  };
  
  
  
  
  const handleChange = (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setError(event.error ? event.error.message : '');
  };

  return (
    <div className='payment'>
        <div className='payment__container'>
            <h1>
                Checkout (
                    <Link to="/checkout">{basket?.length} items</Link>
                    )
            </h1>


            {/* Payment section - delivery address */}
            <div className='payment__section'>
                <div className='payment__title'>
                    <h3>Delivery Address</h3>
                </div>
                <div className='payment__address'>
                    <p>{user?.email}</p>
                    <p>123 React Lane</p>
                    <p>Los Angeles, CA</p>
                </div>
            </div>

            {/* Payment section - Review Items */}
            <div className='payment__section'>
                <div className='payment__title'>
                    <h3>Review items and delivery</h3>
                </div>
                <div className='payment__items'>
                    {basket.map(item => (
                        <CheckoutProduct
                            id={item.id}
                            title={item.title}
                            image={item.image}
                            price={item.price}
                            rating={item.rating}
                        />
                    ))}
                </div>
            </div>
        

            {/* Payment section - Payment method */}
            <div className='payment__section'>
                <div className="payment__title">
                    <h3>Payment Method</h3>
                </div>
                <div className="payment__details">
                        {/* Stripe magic will go */}

                        <form onSubmit={handleSubmit}>
                            <CardElement onChange={handleChange}/>

                            <div className='payment__priceContainer'>
                                <CurrencyFormat
                                    renderText={(value) => (
                                        <h3>Order Total: {value}</h3>
                                    )}
                                    decimalScale={2}
                                    value={getBasketTotal(basket)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    prefix={"$"}
                                />
                                <button disabled={processing || disabled || succeeded}>
                                    <span>{processing ? <p>Processing</p> : "Buy Now"}</span>
                                </button>
                            </div>

                              {/* Errors */}
                            {error && <div>{error}</div>}
                        </form>
                </div>
            </div>
        </div>
    </div>
)
}

export default Payment;
