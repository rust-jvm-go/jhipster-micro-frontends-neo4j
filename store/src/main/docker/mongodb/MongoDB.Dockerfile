FROM mongo:8.0.18
ADD mongodb/scripts/init_replicaset.js init_replicaset.js
