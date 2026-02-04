package initiative.jhipster.mf.neo4j.blog.repository;

import initiative.jhipster.mf.neo4j.blog.domain.Authority;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data Neo4j repository for the Authority entity.
 */
@Repository
public interface AuthorityRepository extends Neo4jRepository<Authority, String> {}
