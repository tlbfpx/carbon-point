package com.carbonpoint.mall.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.mall.dto.ExchangeDTO;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.service.ExchangeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exchanges")
@RequiredArgsConstructor
public class ExchangeController {

    private final ExchangeService exchangeService;

    @PostMapping
    public Result<ExchangeOrder> exchange(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestBody @Valid ExchangeDTO dto) {
        return Result.success(exchangeService.exchange(principal.getUserId(), dto.getProductId()));
    }

    @GetMapping("/orders")
    public Result<Page<ExchangeOrder>> getMyOrders(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        return Result.success(exchangeService.getMyOrders(principal.getUserId(), page, size, status));
    }

    @GetMapping("/orders/{id}")
    public Result<ExchangeOrder> getOrder(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @PathVariable Long id) {
        ExchangeOrder order = exchangeService.getOrderById(id);
        if (!order.getUserId().equals(principal.getUserId())
                && !order.getTenantId().equals(principal.getTenantId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return Result.success(order);
    }

    @PutMapping("/orders/{id}/cancel")
    public Result<Void> cancelOrder(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @PathVariable Long id) {
        exchangeService.cancelOrder(id, principal.getUserId());
        return Result.success();
    }

    /**
     * 管理员取消订单（企业管理员/平台管理员可操作）。
     */
    @PutMapping("/admin/orders/{id}/cancel")
    public Result<Void> adminCancelOrder(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @PathVariable Long id) {
        exchangeService.adminCancelOrder(id, principal.getUserId());
        return Result.success();
    }

    /**
     * 管理员通过券码核销（扫码/输入券码）。
     * coupon_code 有唯一索引，重复核销返回 COUPON_ALREADY_USED（幂等）。
     */
    @PostMapping("/admin/redeem")
    public Result<ExchangeOrder> redeemByCouponCode(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam String couponCode) {
        ExchangeOrder order = exchangeService.redeemByCouponCode(couponCode, principal.getUserId());
        return Result.success(order);
    }

    @PutMapping("/orders/{id}/fulfill")
    public Result<Void> fulfillOrder(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @PathVariable Long id) {
        exchangeService.fulfillOrder(id, principal.getUserId());
        return Result.success();
    }

    @PutMapping("/orders/{id}/use")
    public Result<Void> userConfirmUse(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @PathVariable Long id) {
        exchangeService.userConfirmUse(id, principal.getUserId());
        return Result.success();
    }

    @GetMapping("/admin/orders")
    public Result<Page<ExchangeOrder>> getTenantOrders(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        return Result.success(exchangeService.getOrdersByTenant(principal.getTenantId(), page, size, status));
    }

    /**
     * Get user's coupons (exchange orders of type 'coupon').
     */
    @GetMapping("/coupons")
    public Result<java.util.List<java.util.Map<String, Object>>> getMyCoupons(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(required = false) String status) {
        return Result.success(exchangeService.getMyCoupons(principal.getUserId(), status));
    }
}
