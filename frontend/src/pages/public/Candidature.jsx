import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import styles from './Candidature.module.css';

const AREAS = [
  '🤖 Robotics & Mechanics',
  '💻 Programming & AI',
  '⚡ Electronics & Hardware',
  '🎨 Design & Creativity',
  '📢 Communication & Events',
];

const LEVELS = ['1st year', '2nd year', '3rd year'];

const empty = {
  prenom: '',
  nom: '',
  email: '',
  facebook_link: '',
  telephone: '',
  filiere: '',
  annee: '',
  adresse: '',
  motivation: '',
  motivation_robotics: '',
  domaine_interet: '',
  unique_about: '',
};

export default function Candidature({ stream = 'general' }) {
  const isMedia = stream === 'media_babies';
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState(null);
  const [piece, setPiece] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    api
      .get('/recruitment/status')
      .then((res) =>
        setOpen(
          isMedia ? !!res.data.candidature_ouverte_media : !!res.data.candidature_ouverte
        )
      )
      .catch(() => setOpen(false));
  }, [isMedia]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current || submitting) return;

    setError('');
    setSuccess('');

    if (!photo) {
      setError('Please upload a picture for the member card.');
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    data.append('stream', stream);
    data.append('photo', photo);
    if (piece) data.append('piece_jointe', piece);

    submitLock.current = true;
    setSubmitting(true);
    try {
      const { data: res } = await api.post('/recruitment/apply', data);
      setSuccess(res.message || 'Application submitted successfully.');
      setForm(empty);
      setPhoto(null);
      setPiece(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed.');
      submitLock.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  if (open === null) return <Loader />;

  if (!open) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={`container ${styles.wrap}`}>
          <section className={styles.introCard}>
            <h1>Candidatures fermées</h1>
            <hr className={styles.rule} />
            <p>
              {isMedia
                ? 'Les candidatures Media Babies ne sont pas ouvertes pour le moment. Revenez bientôt.'
                : 'Les candidatures ENISo Team ne sont pas ouvertes pour le moment. Revenez bientôt ou suivez nos réseaux pour la prochaine campagne de recrutement.'}
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={`page ${styles.page}`}>
      <div className={`container ${styles.wrap}`}>
        <section className={styles.introCard}>
          {isMedia ? (
            <>
              <h1>Media Babies</h1>
              <hr className={styles.rule} />
              <p className={styles.announce}>
                <strong>Rejoignez Media Babies — ENISO Team</strong>
              </p>
              <p>
                Passionné(e) de contenu, de création visuelle ou de communication ? Media Babies
                est l’espace pour apprendre, créer et donner de la voix aux projets du club.
              </p>
              <p className={styles.motto}>
                <strong>ENISo Team — One Team, One Dream.</strong>
              </p>
              <p className={styles.cta}>⬇️ Remplissez le formulaire ci-dessous ⬇️</p>
            </>
          ) : (
            <>
              <h1>Welcome To Our Family!</h1>
              <hr className={styles.rule} />
              <p className={styles.announce}>
                🚀 <strong>Big News from ENISo Team!</strong> 🚀
              </p>
              <p>
                Are you ready to begin an exciting journey and dive into the fascinating world of
                robotics? 🌟 We&apos;re inviting passionate minds to join our vibrant community — a
                place where you can{' '}
                <strong>
                  sharpen your skills, contribute to groundbreaking projects, and feel the thrill of
                  robotics competitions!
                </strong>{' '}
                🤖 🏆
              </p>
              <p>
                At ENISo Team, we proudly take part in <strong>prestigious robotics challenges</strong>,
                pushing the limits of innovation and showcasing our talent on international stages. By
                joining us, you&apos;ll have the chance to{' '}
                <strong>create, compete, and leave your mark in the robotics world.</strong> 💡 🌐
              </p>
              <p>
                ✨ We can&apos;t wait to welcome you and share this incredible adventure together. To get
                started, simply fill out the recruitment form below and bring your passion, creativity,
                and drive! 💖
              </p>
              <p className={styles.motto}>
                <strong>ENISo Team — One Team, One Dream.</strong> 🌟
              </p>
              <p className={styles.cta}>
                ⬇️ Fill out the form and let&apos;s build the future together! ⬇️
              </p>
            </>
          )}
        </section>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.fieldCard}>
            <label htmlFor="prenom">
              First name <span>*</span>
            </label>
            <input
              id="prenom"
              name="prenom"
              value={form.prenom}
              onChange={onChange}
              placeholder="Short answer"
              required
            />
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="nom">
              Last name <span>*</span>
            </label>
            <input
              id="nom"
              name="nom"
              value={form.nom}
              onChange={onChange}
              placeholder="Short answer"
              required
            />
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="email">
              Email address <span>*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="Short answer"
              required
            />
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="facebook_link">
              Facebook link <span>*</span>
            </label>
            <textarea
              id="facebook_link"
              name="facebook_link"
              value={form.facebook_link}
              onChange={onChange}
              placeholder="Long answer"
              required
              rows={3}
            />
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="telephone">
              Phone number <span>*</span>
            </label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.telephone}
              onChange={onChange}
              placeholder="e.g. 20 123 456"
              pattern="[0-9+\s().-]{8,}"
              title="Enter a valid phone number (at least 8 digits)"
              required
            />
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="filiere">
              Field of study <span>*</span>
            </label>
            <input
              id="filiere"
              name="filiere"
              value={form.filiere}
              onChange={onChange}
              placeholder="Short answer"
              required
            />
          </div>

          <div className={styles.fieldCard}>
            <p className={styles.question}>Level of study</p>
            <div className={styles.choices}>
              {LEVELS.map((level) => (
                <label key={level} className={styles.choice}>
                  <input
                    type="radio"
                    name="annee"
                    value={level}
                    checked={form.annee === level}
                    onChange={onChange}
                  />
                  <span>{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="photo">
              Picture (for member card) <span>*</span>
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              required
            />
            {photo && <p className={styles.fileName}>{photo.name}</p>}
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="adresse">
              Address <span>*</span>
            </label>
            <input
              id="adresse"
              name="adresse"
              value={form.adresse}
              onChange={onChange}
              placeholder="Short answer"
              required
            />
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="motivation">
              Why do you want to join the ENISo Team? <span>*</span>
            </label>
            <textarea
              id="motivation"
              name="motivation"
              value={form.motivation}
              onChange={onChange}
              placeholder="Long answer"
              required
              rows={4}
            />
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="motivation_robotics">
              What motivates you the most about robotics and technology? <span>*</span>
            </label>
            <textarea
              id="motivation_robotics"
              name="motivation_robotics"
              value={form.motivation_robotics}
              onChange={onChange}
              placeholder="Long answer"
              required
              rows={4}
            />
          </div>

          <div className={styles.fieldCard}>
            <p className={styles.question}>
              Which area interests you the most in our team? <span>*</span>
            </p>
            <div className={styles.choices}>
              {AREAS.map((area) => (
                <label key={area} className={styles.choice}>
                  <input
                    type="radio"
                    name="domaine_interet"
                    value={area}
                    checked={form.domaine_interet === area}
                    onChange={onChange}
                    required
                  />
                  <span>{area}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="unique_about">
              Tell us something unique about yourself! ✨ <span>*</span>
            </label>
            <textarea
              id="unique_about"
              name="unique_about"
              value={form.unique_about}
              onChange={onChange}
              placeholder="Long answer"
              required
              rows={4}
            />
          </div>

          <div className={styles.fieldCard}>
            <label htmlFor="piece_jointe">
              If you have a CV, portfolio, or previous project to share, please attach it.
            </label>
            <input
              id="piece_jointe"
              name="piece_jointe"
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setPiece(e.target.files?.[0] || null)}
            />
            {piece && <p className={styles.fileName}>{piece.name}</p>}
          </div>

          <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}
