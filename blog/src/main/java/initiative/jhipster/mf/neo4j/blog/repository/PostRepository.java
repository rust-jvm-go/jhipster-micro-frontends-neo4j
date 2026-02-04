package initiative.jhipster.mf.neo4j.blog.repository;

import initiative.jhipster.mf.neo4j.blog.domain.Post;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data Neo4j repository for the Post entity.
 */
@Repository
public interface PostRepository extends Neo4jRepository<Post, String> {}
