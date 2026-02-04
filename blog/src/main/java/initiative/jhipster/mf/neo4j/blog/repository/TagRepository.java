package initiative.jhipster.mf.neo4j.blog.repository;

import initiative.jhipster.mf.neo4j.blog.domain.Tag;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data Neo4j repository for the Tag entity.
 */
@Repository
public interface TagRepository extends Neo4jRepository<Tag, String> {}
