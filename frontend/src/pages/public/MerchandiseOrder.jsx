import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import styles from './MerchandiseOrder.module.css';

const STUDY_FIELDS = [
  ['EI', 'Électronique industrielle (EI)'],
  ['MECA', 'Mécatronique (MECA)'],
  ['IA', 'Informatique appliquée (IA)'],
  ['GTE', 'Télécommunications embarquées (GTE)'],
  ['GMP', 'Mécanique et productique (GMP)'],
  ['ASE', 'Automobile Software Engineering (ASE)'],
  ['MASTER', 'Mastère'],
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function ProductViewer3D({ label, frontImage, backImage }) {
  const [flipped, setFlipped] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const showSide = (back) => {
    setFlipped(back);
    setTilt({ x: 0, y: back ? 180 : 0 });
  };

  const onPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - py) * 6,
      y: (px - 0.5) * 12 + (flipped ? 180 : 0),
    });
  };

  const onPointerLeave = () => {
    setTilt({ x: 0, y: flipped ? 180 : 0 });
    setDragging(false);
  };

  return (
    <div className={styles.viewer3d}>
      <div className={styles.studioGlow} aria-hidden="true" />
      <div
        className={`${styles.stage3d} ${dragging ? styles.stageDragging : ''}`}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onClick={() => showSide(!flipped)}
        role="button"
        tabIndex={0}
        aria-label={`Tourner le ${label} en 3D`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showSide(!flipped);
          }
        }}
      >
        <div className={styles.float3d}>
          <div
            className={styles.card3d}
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
          >
            <div className={`${styles.face3d} ${styles.faceFront}`}>
              <img src={frontImage} alt={`${label} ENISO Team — face avant`} />
            </div>
            <div className={`${styles.face3d} ${styles.faceBack}`}>
              <img src={backImage} alt={`${label} ENISO Team — face arrière`} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.viewerHint}>
        <button
          type="button"
          className={`${styles.viewBtn} ${!flipped ? styles.viewBtnActive : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            showSide(false);
          }}
        >
          Avant
        </button>
        <button
          type="button"
          className={`${styles.viewBtn} ${flipped ? styles.viewBtnActive : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            showSide(true);
          }}
        >
          Arrière
        </button>
      </div>
    </div>
  );
}

export default function MerchandiseOrder() {
  const { variant } = useParams();
  const { user } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    nom_complet: user?.nom || '',
    telephone: '',
    email: user?.email || '',
    filiere: user?.filiere || '',
    taille: '',
    accepte_paiement: '',
  });

  const isHoodie = variant === 'capuche';
  const productName = isHoodie ? 'Hoodie ENISO Team' : 'T-shirt ENISO Team';

  useEffect(() => {
    setLoading(true);
    api
      .get(`/finance/merchandise/${variant}`)
      .then(({ data }) => {
        setOffer(data);
        setForm((current) => ({
          ...current,
          nom_complet: current.nom_complet || data.membre?.nom || '',
          email: current.email || data.membre?.email || '',
          filiere: current.filiere || data.membre?.filiere || '',
        }));
      })
      .catch((err) =>
        setError(err.response?.data?.message || 'Ce formulaire est indisponible.')
      )
      .finally(() => setLoading(false));
  }, [variant]);

  const initials = useMemo(
    () =>
      (offer?.tresoriere?.nom || 'Mariem Moussi')
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [offer]
  );

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const { data } = await api.post(`/finance/merchandise/${variant}/orders`, form);
      setSuccess(data.message);
      setForm((current) => ({ ...current, telephone: '', taille: '', accepte_paiement: '' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'La commande n’a pas pu être envoyée.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  if (!offer) {
    return (
      <main className={`page ${styles.page}`}>
        <div className={`container ${styles.narrow}`}>
          <div className={styles.closedCard}>
            <span>Formulaire fermé</span>
            <h1>{productName}</h1>
            <p>{error}</p>
            <Link to="/" className="btn btn-secondary">
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`page ${styles.page}`}>
      <div className={`container ${styles.narrow}`}>
        <header className={`${styles.hero} ${styles.heroWith3d}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Collection officielle · ENISO Team</p>
            <h1>{productName}</h1>
            <p className={styles.lead}>
              Portez fièrement les couleurs de l’ENISO Team. Réservez votre exemplaire
              en quelques secondes.
            </p>
            <div className={styles.priceRow}>
              <div>
                <span>Prix</span>
                <strong>{offer.prix_total} DT</strong>
              </div>
            </div>
            <div className={styles.tags}>
              <span>#enisoteam 💙</span>
              <span>#oneteamonedream 💙</span>
            </div>
          </div>

          <div className={`${styles.productVisual} ${styles.productVisual3d}`}>
            <ProductViewer3D
              label={isHoodie ? 'Hoodie' : 'T-shirt'}
              frontImage={
                assetUrl(offer.photo_url) ||
                (isHoodie ? '/merch/hoodie-front.png' : '/merch/tshirt-front.png')
              }
              backImage={
                assetUrl(offer.photo_back_url) ||
                (isHoodie ? '/merch/hoodie-back.png' : '/merch/tshirt-back.png')
              }
            />
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form className={styles.form} onSubmit={submit}>
          <div className={styles.formHead}>
            <div>
              <p className={styles.step}>Commande</p>
              <h2>Vos informations</h2>
            </div>
            <span>Tous les champs sont obligatoires</span>
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Nom complet *</span>
              <input
                value={form.nom_complet}
                onChange={(e) => setValue('nom_complet', e.target.value)}
                placeholder="Prénom et nom"
                required
              />
            </label>
            <label className={styles.field}>
              <span>Numéro de téléphone *</span>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => setValue('telephone', e.target.value)}
                placeholder="+216 XX XXX XXX"
                required
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Adresse email *</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setValue('email', e.target.value)}
              placeholder="nom@exemple.com"
              required
            />
          </label>

          <fieldset className={styles.choiceCard}>
            <legend>Filière *</legend>
            <div className={styles.options}>
              {STUDY_FIELDS.map(([value, label]) => (
                <label
                  key={value}
                  className={`${styles.option} ${
                    form.filiere === value ? styles.optionSelected : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="filiere"
                    value={value}
                    checked={form.filiere === value}
                    onChange={(e) => setValue('filiere', e.target.value)}
                    required
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.choiceCard}>
            <legend>Taille *</legend>
            <div className={styles.sizes}>
              {SIZES.map((size) => (
                <label
                  key={size}
                  className={`${styles.size} ${
                    form.taille === size ? styles.sizeSelected : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="taille"
                    value={size}
                    checked={form.taille === size}
                    onChange={(e) => setValue('taille', e.target.value)}
                    required
                  />
                  <span>{size}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.choiceCard}>
            <legend>
              Acceptez-vous de payer {offer.prix_total} DT ? *
            </legend>
            <div className={styles.sizes}>
              {[
                ['oui', 'Oui'],
                ['non', 'Non'],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className={`${styles.size} ${
                    form.accepte_paiement === value ? styles.sizeSelected : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="accepte_paiement"
                    value={value}
                    checked={form.accepte_paiement === value}
                    onChange={(e) => setValue('accepte_paiement', e.target.value)}
                    required
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <aside className={styles.treasurer}>
            <div className={styles.avatar}>{initials}</div>
            <div>
              <span>Contact</span>
              <strong>{offer.tresoriere?.nom || 'Mariem Moussi'} · Trésorière</strong>
              <p>
                Après l’envoi, contactez la trésorière pour finaliser votre réservation
                {offer.tresoriere?.telephone
                  ? ` au ${offer.tresoriere.telephone}`
                  : '.'}
              </p>
            </div>
          </aside>

          <div className={styles.actions}>
            <Link to="/" className="btn btn-secondary">
              Annuler
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Envoi en cours…' : `Réserver mon ${isHoodie ? 'hoodie' : 'T-shirt'}`}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
