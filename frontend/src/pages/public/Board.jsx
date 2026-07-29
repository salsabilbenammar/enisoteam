import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import BoardCarouselItem from '../../components/public/BoardCarouselItem';
import BoardDetailModal from '../../components/public/BoardDetailModal';
import { mergeBoardMembers } from '../../data/boardRoles';
import styles from './Board.module.css';

const DEFAULT_TITLE = 'Bureau Exécutif 2026/2027';

export default function Board() {
  const [members, setMembers] = useState([]);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/board').then((res) => mergeBoardMembers(res.data)).catch(() => mergeBoardMembers([])),
      api
        .get('/site-settings')
        .then((res) => res.data.board_title || DEFAULT_TITLE)
        .catch(() => DEFAULT_TITLE),
    ])
      .then(([boardMembers, boardTitle]) => {
        setMembers(boardMembers);
        setTitle(boardTitle);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  if (loading) return <Loader />;

  const trackItems = [...members, ...members];

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>{title}</h1>
          <p>
            Découvrez les visages et les missions qui font vivre l&apos;ENISo Team : cliquez sur
            une icône pour plonger dans les coulisses de notre Bureau Exécutif !
          </p>
        </header>

        <div className={`${styles.marquee} ${selected ? styles.paused : ''}`}>
          <div className={styles.track}>
            {trackItems.map((m, i) => (
              <BoardCarouselItem
                key={`${m.id}-${i}`}
                member={m}
                onClick={setSelected}
              />
            ))}
          </div>
        </div>

        <p className={styles.hint}>Cliquez pour découvrir chaque mission</p>
      </div>

      <BoardDetailModal member={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
