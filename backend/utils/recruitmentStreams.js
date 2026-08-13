const STREAM_GENERAL = 'general';
const STREAM_MEDIA = 'media_babies';

function normalizeStream(value) {
  return String(value || '').trim() === STREAM_MEDIA ? STREAM_MEDIA : STREAM_GENERAL;
}

function isMediaStream(value) {
  return normalizeStream(value) === STREAM_MEDIA;
}

module.exports = {
  STREAM_GENERAL,
  STREAM_MEDIA,
  normalizeStream,
  isMediaStream,
};
