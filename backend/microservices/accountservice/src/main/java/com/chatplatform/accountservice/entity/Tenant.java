package com.chatplatform.accountservice.entity;

import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

/**
 * R2DBC mapping for the same {@code tenant} table chatservice's JPA {@code Tenant} entity maps -
 * two services, one table (see AGENTS.md's "accountservice" section for why). No
 * {@code @PrePersist}/{@code @PreUpdate} lifecycle here - R2DBC entities don't have them; {@code
 * TenantService} stamps id/timestamps/audit fields explicitly before {@code save()}.
 *
 * <p>{@code @EqualsAndHashCode(onlyExplicitlyIncluded = true)} on just {@code tenantId}, not
 * Lombok's {@code @Data} default of every field - the usual ORM-entity gotcha (equality shifting as
 * mutable fields change after the row's been inserted, e.g. in a Set).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Table("tenant")
public class Tenant {

  @Id
  @EqualsAndHashCode.Include
  @Column("tenant_id")
  private UUID tenantId;

  private String slug;
  private String name;
  private TenantStatus status;

  @Column("created_at")
  private OffsetDateTime createdAt;

  @Column("updated_at")
  private OffsetDateTime updatedAt;

  @Column("created_by")
  private String createdBy;

  @Column("updated_by")
  private String updatedBy;

  @Version private Long version;
}
