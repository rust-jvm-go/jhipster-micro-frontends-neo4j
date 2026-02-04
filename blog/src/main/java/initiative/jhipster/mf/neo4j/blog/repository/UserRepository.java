package initiative.jhipster.mf.neo4j.blog.repository;

import initiative.jhipster.mf.neo4j.blog.domain.User;
import java.util.List;
import java.util.Optional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data Neo4j repository for the {@link User} entity.
 */
@Repository
public interface UserRepository extends Neo4jRepository<User, String> {
    String USERS_BY_LOGIN_CACHE = "usersByLogin";

    String USERS_BY_EMAIL_CACHE = "usersByEmail";

    @Cacheable(cacheNames = USERS_BY_LOGIN_CACHE, unless = "#result == null")
    Optional<User> findOneByLogin(String login);

    // See https://github.com/neo4j/sdn-rx/issues/51
    List<User> findAll();

    Page<User> findAllByIdNotNullAndActivatedIsTrue(Pageable pageable);
}
