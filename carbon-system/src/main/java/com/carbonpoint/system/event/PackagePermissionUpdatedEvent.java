package com.carbonpoint.system.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PackagePermissionUpdatedEvent {
    private final Long packageId;
}
